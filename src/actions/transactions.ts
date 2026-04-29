'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { TransType, PayMethod } from '@prisma/client'

export async function addTransaction(data: {
  type: TransType
  amount: number
  method: PayMethod
  description?: string
  staffId?: number
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const tx = await prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      method: data.method,
      description: data.description,
      staffId: data.staffId,
      recordedById: session.user.id
    }
  })
  
  revalidatePath('/')
  revalidatePath('/staff')
  return tx
}

export async function getDashboardData() {
  const session = await auth()
  const role = session?.user?.role

  // If cashier, they only see their own transactions. Super Admin/Admin/Owner see everything.
  const whereClause = (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OWNER') ? {} : { recordedById: session?.user?.id }

  const allTxs = await prisma.transaction.findMany({
    where: { 
      ...whereClause,
    },
    orderBy: { createdAt: 'desc' },
    include: { staff: true, agent: true }
  })

  // Separate for the UI
  const transactions = allTxs.filter(tx => !tx.isInternal)
  const internalTransactions = role === 'SUPER_ADMIN' ? allTxs.filter(tx => tx.isInternal) : []

  type TxWithRelations = (typeof allTxs)[number]

  let cashInDrawer = 0
  let networkSales = 0
  let totalOutstandingCredit = 0
  let monthlySalaryPool = 0
  let salaryPayouts = 0
  
  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()

  allTxs.forEach((tx: TxWithRelations) => {
    const isNeutral = tx.description?.includes('[DRAWER_NEUTRAL]')
    if (isNeutral) return;

    const txDate = new Date(tx.createdAt)
    const isThisMonth = txDate.getMonth() === curMonth && txDate.getFullYear() === curYear

    // For drawer metrics (cashInDrawer, networkSales), we only count transactions 
    // that haven't been settled yet. Cash is further restricted to not being part of a handover.
    const isActiveInDrawer = tx.method === 'NETWORK' 
      ? !tx.isSettled 
      : (!tx.isSettled && tx.settlementId === null)

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        if (isActiveInDrawer) cashInDrawer += tx.amount
        if (isThisMonth) monthlySalaryPool += tx.amount
      } else if (tx.method === 'NETWORK' || tx.method === 'TABBY' || tx.method === 'TAMARA') {
        if (isActiveInDrawer) networkSales += tx.amount
      } else if (tx.method === 'CREDIT' && !tx.isSettled) {
        totalOutstandingCredit += tx.amount
      }
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH') {
        if (isActiveInDrawer) cashInDrawer -= tx.amount
        if (isThisMonth) monthlySalaryPool -= tx.amount
      }
      if ((tx.method === 'NETWORK' || tx.method === 'TABBY' || tx.method === 'TAMARA') && isActiveInDrawer) networkSales -= tx.amount
    } else if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT'].includes(tx.type)) {
      if (tx.method === 'CASH' && isActiveInDrawer) cashInDrawer -= tx.amount
      else if (tx.method === 'NETWORK' && isActiveInDrawer) networkSales -= tx.amount
    } else if (tx.type === 'SALARY_PAYMENT') {
      // Per user request, salary settlements are from a dedicated fund and don't affect standard cash account
      if (isThisMonth) salaryPayouts += tx.amount
    }
  })

  // Final available pool is total monthly sales minus what was paid out as salary
  const salaryFundRemaining = monthlySalaryPool - salaryPayouts

  return {
    cashInDrawer,
    networkSales,
    salaryFundRemaining,
    totalOutstandingCredit,
    transactions,
    allStaffTransactions: allTxs, // Complete list including internal corrections
    internalTransactions, // Passed to the client for Super Admin view
    recentSettlements: await prisma.settlement.findMany({
      orderBy: { reportDate: 'desc' },
      take: 5,
      include: {
        performedBy: {
          select: { name: true }
        }
      }
    })
  }
}

export async function getSettlementHistory() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.settlement.findMany({
    orderBy: { reportDate: 'desc' },
    include: {
      transactions: {
        select: { id: true }
      }
    }
  })
}

export async function getSettlementDetails(id: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.settlement.findUnique({
    where: { id },
    include: {
      transactions: true,
      performedBy: {
        select: { name: true }
      }
    }
  })
}

export async function recordRefund(data: {
  amount: number
  method: 'CASH' | 'NETWORK' | 'TABBY' | 'TAMARA'
  description?: string
  invoiceNumber?: string
  reason?: string
  returnedItems?: { itemId: number; quantity: number; shouldRestock: boolean }[]
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (!data.amount || data.amount <= 0) throw new Error('Refund amount must be greater than zero')

  const fullDescription = data.reason
    ? `[${data.reason}] ${data.description || ''}`.trim()
    : data.description

  // ── Atomic operation: all DB writes succeed or all roll back ─────────────────
  const tx = await prisma.$transaction(async (db) => {
    // 1. Create the financial RETURN transaction
    const returnTx = await db.transaction.create({
      data: {
        type: 'RETURN',
        amount: data.amount,
        method: data.method,
        description: fullDescription,
        invoiceNumber: data.invoiceNumber,
        recordedById: session.user.id,
      },
    })

    // 2. Process each returned inventory item
    if (data.returnedItems && data.returnedItems.length > 0) {
      for (const item of data.returnedItems) {
        if (item.quantity <= 0) continue

        // 2a. Restock inventory if requested
        if (item.shouldRestock) {
          await db.inventoryItem.update({
            where: { id: item.itemId },
            data: { currentStock: { increment: item.quantity } },
          })
        }

        // 2b. Fetch current cost/price for the movement record
        const invItem = await db.inventoryItem.findUnique({
          where: { id: item.itemId },
          select: { unitCost: true, sellingPrice: true },
        })

        // 2c. Create the stock movement
        await db.stockMovement.create({
          data: {
            itemId: item.itemId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            unitCost: invItem?.unitCost || 0,
            sellingPrice: invItem?.sellingPrice || 0,
            isRestocked: item.shouldRestock,
            note: `Returned from invoice ${data.invoiceNumber || 'Unknown'}. Reason: ${data.reason || 'None'}. ${item.shouldRestock ? 'Restocked.' : 'Not restocked.'}`,
            transactionId: returnTx.id,
            invoiceNumber: data.invoiceNumber,
            recordedById: session.user.id,
          },
        })
      }
    }

    return returnTx
  })

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/inventory')
  return tx
}

export async function settleSalary(data: { staffId: number, month: number, year: number, method: 'CASH' | 'NETWORK' }) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'OWNER') {
    throw new Error("Unauthorized")
  }

  // 1. Get staff info and unsettled advances
  const staff = await prisma.staff.findUnique({ 
    where: { id: data.staffId },
    include: { transactions: {
      where: {
        type: { in: ['ADVANCE', 'EXPENSE'] },
        isSettled: false
      }
    }}
  })
  
  if (!staff) throw new Error("Staff not found")

  const totalAdvances = staff.transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const netPaid = staff.baseSalary - totalAdvances

  // 2. Create SalarySettlement record
  const salarySettlement = await prisma.salarySettlement.create({
    data: {
      staffId: data.staffId,
      month: data.month,
      year: data.year,
      baseSalary: staff.baseSalary,
      advancesTally: totalAdvances,
      netPaid: netPaid,
      method: data.method,
      transactions: {
        connect: staff.transactions.map(tx => ({ id: tx.id }))
      }
    }
  })

  // 3. Record final SALARY_PAYMENT if netPaid > 0
  if (netPaid > 0) {
    await prisma.transaction.create({
      data: {
        type: 'SALARY_PAYMENT',
        amount: netPaid,
        method: data.method,
        description: `Final payout for period ${data.month}/${data.year}`,
        staffId: data.staffId,
        recordedById: session.user.id,
        isSettled: true,
        salarySettlementId: salarySettlement.id
      }
    })
  }

  // 4. Mark advances as settled
  await prisma.transaction.updateMany({
    where: { 
      id: { in: staff.transactions.map(tx => tx.id) } 
    },
    data: { isSettled: true }
  })

  revalidatePath('/')
  revalidatePath('/staff')
  return salarySettlement
}

export async function settleAllSalaries(data: { month: number, year: number, method: 'CASH' | 'NETWORK' }) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized. Bulk settlement is restricted to Administrators.")
  }

  const staffMembers = await prisma.staff.findMany({ where: { isActive: true }})
  const results = []
  for (const s of staffMembers) {
    results.push(await settleSalary({ staffId: s.id, month: data.month, year: data.year, method: data.method }))
  }
  return results
}

export async function editAdvance(transactionId: number, newAmount: number) {
  const session = await auth()
  
  if (session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized. Only Super Admins can modify advances.')
  }
  
  // 1. Get existing original transaction
  const originalTx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { staff: true }
  })
  if (!originalTx) throw new Error("Transaction not found")

  // 2. Clear any previous internal corrections for this specific advance to keep it clean
  await prisma.transaction.deleteMany({
    where: {
      description: { contains: `[CORRECTION FOR #${transactionId}]` },
      isInternal: true
    }
  })

  // 3. Calculate the difference relative to the ORIGINAL amount
  // We don't modify the original record as per user request for audit trail
  const diff = originalTx.amount - newAmount
  
  if (Math.abs(diff) > 0.01) {
    // 4. Create the correction entry (marked as internal so it's hidden from dashboard)
    await prisma.transaction.create({
      data: {
        type: 'ADVANCE',
        amount: -diff, // Negative if we are reducing the advance, positive if increasing
        method: originalTx.method,
        description: `[CORRECTION FOR #${transactionId}] [DRAWER_NEUTRAL] Adjusted from ${originalTx.amount} to ${newAmount}`,
        isInternal: true,
        staffId: originalTx.staffId,
        recordedById: session.user.id
      }
    })
  }

  revalidatePath('/')
  revalidatePath('/staff')
  return originalTx
}

export async function createSettlement(actualCashCounted: number) {
  console.log('[createSettlement] Starting...', { actualCashCounted })
  const session = await auth()
  console.log('[createSettlement] Session:', session?.user?.id)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Finds all unsettled transactions that haven't been part of a cash settlement report yet
  console.log('[createSettlement] Fetching unsettled transactions...')
  const unsettled = await prisma.transaction.findMany({
    where: { 
      isSettled: false,
      settlementId: null
    }
  })

  if (unsettled.length === 0) return null

  type UnsettledTx = (typeof unsettled)[number]

  const cashHanded = unsettled.reduce((acc: number, tx: UnsettledTx) => {
    if (tx.description?.includes('[DRAWER_NEUTRAL]')) return acc;
    if (tx.type === 'SALE' && tx.method === 'CASH') return acc + tx.amount;
    if (tx.type === 'RETURN' && tx.method === 'CASH') return acc - tx.amount;
    if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT'].includes(tx.type) && tx.method === 'CASH') return acc - tx.amount;
    return acc;
  }, 0)

  const networkVolume = unsettled.reduce((acc: number, tx: UnsettledTx) => {
    if (tx.description?.includes('[DRAWER_NEUTRAL]')) return acc;
    if (tx.type === 'SALE' && tx.method === 'NETWORK') return acc + tx.amount;
    if (tx.type === 'RETURN' && tx.method === 'NETWORK') return acc - tx.amount;
    if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT'].includes(tx.type) && tx.method === 'NETWORK') return acc - tx.amount;
    return acc;
  }, 0)

  const settlement = await prisma.settlement.create({
    data: {
      totalCashHanded: cashHanded,
      actualCashCounted: actualCashCounted,
      totalNetworkVolume: networkVolume,
      performedById: session.user.id,
      transactions: {
        connect: unsettled.map((t: UnsettledTx) => ({ id: t.id }))
      }
    },
    include: {
      transactions: true,
      performedBy: {
        select: { name: true }
      }
    }
  })
  console.log('[createSettlement] Settlement created:', settlement.id)

  // Mark as settled ONLY if they are not staff-related.
  // Staff ADVANCE and staff-linked EXPENSE must stay isSettled: false 
  // so they can be settled later in the monthly Staff Salary workflow.
  await prisma.transaction.updateMany({
    where: { 
      id: { in: unsettled.map((t: UnsettledTx) => t.id) },
      method: 'CASH', // Only cash is physically settled and cleared from drawer
      NOT: {
        OR: [
          { type: 'ADVANCE' },
          { type: 'SALARY_PAYMENT' },
          { AND: [{ type: 'EXPENSE' }, { NOT: { staffId: null } }] }
        ]
      }
    },
    data: { isSettled: true }
  })

  revalidatePath('/')
  revalidatePath('/staff')
  return settlement
}

export async function recordDailySales(data: {
  paymentMode: 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA' | 'CREDIT'
  totalAmount: number
  cashAmount?: number
  networkAmount?: number
  description?: string
  consumedItems?: { itemId: number; quantity: number }[]
  customerName?: string
  customerPhone?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  type SaleTx = {
    type: 'SALE'
    method: 'CASH' | 'NETWORK' | 'TABBY' | 'TAMARA' | 'CREDIT'
    amount: number
    description?: string
    recordedById: string
    createdAt: Date
    invoiceNumber: string
    customerName?: string
    customerPhone?: string
  }

  const exactTime = new Date()
  const invoiceNumber = `INV-${Date.now()}` // Generate a unique serial number
  const transactions: SaleTx[] = []

  if (data.paymentMode === 'SPLIT') {
    const cashAmt = data.cashAmount ?? 0
    const netAmt = data.networkAmount ?? data.totalAmount - cashAmt
    if (cashAmt > 0) {
      transactions.push({ type: 'SALE', method: 'CASH', amount: cashAmt, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber })
    }
    if (netAmt > 0) {
      transactions.push({ type: 'SALE', method: 'NETWORK', amount: netAmt, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber })
    }
  } else if (data.paymentMode === 'TABBY') {
    transactions.push({ type: 'SALE', method: 'TABBY', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber })
  } else if (data.paymentMode === 'TAMARA') {
    transactions.push({ type: 'SALE', method: 'TAMARA', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber })
  } else if (data.paymentMode === 'NETWORK') {
    transactions.push({ type: 'SALE', method: 'NETWORK', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber })
  } else if (data.paymentMode === 'CREDIT') {
    if (!data.customerName || !data.customerPhone) throw new Error('Customer name and phone are required for credit sales.')
    transactions.push({ 
      type: 'SALE', 
      method: 'CREDIT', 
      amount: data.totalAmount, 
      description: data.description, 
      recordedById: session.user.id, 
      createdAt: exactTime, 
      invoiceNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone
    })
  } else {
    transactions.push({ type: 'SALE', method: 'CASH', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber })
  }

  if (transactions.length > 0) {
    await prisma.transaction.createMany({ data: transactions })
  }

  // Consume inventory items if provided
  if (data.consumedItems && data.consumedItems.length > 0) {
    for (const ci of data.consumedItems) {
      if (ci.quantity <= 0) continue
      await prisma.inventoryItem.update({
        where: { id: ci.itemId },
        data: { currentStock: { decrement: ci.quantity } },
      })
      const item = await prisma.inventoryItem.findUnique({ where: { id: ci.itemId }, select: { unitCost: true, sellingPrice: true } })
      await prisma.stockMovement.create({
        data: {
          itemId: ci.itemId,
          type: 'SALE_OUT',
          quantity: -ci.quantity,
          unitCost: item?.unitCost || 0,
          sellingPrice: item?.sellingPrice || 0,
          note: `Consumed in sale — ${data.description || 'no description'}`,
          invoiceNumber: invoiceNumber,
          recordedById: session.user.id,
        },
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/inventory')
}

export async function settleCreditSale(data: {
  transactionId: number
  paymentMethod: 'CASH' | 'NETWORK'
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const originalTx = await prisma.transaction.findUnique({
    where: { id: data.transactionId }
  })

  if (!originalTx || originalTx.method !== 'CREDIT') throw new Error("Invalid transaction")

  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark original as settled
    await tx.transaction.update({
      where: { id: data.transactionId },
      data: { isSettled: true }
    })

    // 2. Create the actual payment record
    return await tx.transaction.create({
      data: {
        type: 'SALE',
        amount: originalTx.amount,
        method: data.paymentMethod,
        description: `[SETTLEMENT] Payment for Invoice ${originalTx.invoiceNumber || originalTx.id}. Customer: ${originalTx.customerName || 'N/A'}`,
        recordedById: session.user.id,
        linkedTransactionId: originalTx.id,
        invoiceNumber: originalTx.invoiceNumber,
        customerName: originalTx.customerName,
        customerPhone: originalTx.customerPhone,
        isSettled: false // Standard sales are unsettled until cash handover
      }
    })
  })

  revalidatePath('/')
  revalidatePath('/sales')
  return result
}

export async function getRecentSalesForRefund() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.transaction.findMany({
    where: { type: 'SALE' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, amount: true, description: true, createdAt: true, method: true, invoiceNumber: true }
  })
}

export async function getInvoiceDetails(invoiceNumber: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [saleTxs, returnTxs, saleMovements, returnMovements] = await Promise.all([
    prisma.transaction.findMany({ where: { invoiceNumber, type: 'SALE' } }),
    // Check for existing refunds so UI can warn about double-refunds
    prisma.transaction.findMany({ where: { invoiceNumber, type: 'RETURN' } }),
    prisma.stockMovement.findMany({
      where: { invoiceNumber, type: 'SALE_OUT' },
      include: { item: true },
    }),
    prisma.stockMovement.findMany({
      where: { invoiceNumber, type: 'RETURN_IN' },
      include: { item: true },
    }),
  ])

  if (saleTxs.length === 0) return null

  const totalAmount = saleTxs.reduce((sum, tx) => sum + tx.amount, 0)
  const alreadyRefunded = returnTxs.reduce((sum, tx) => sum + tx.amount, 0)

  // Build per-item quantity already returned
  const returnedQtyByItem: Record<number, number> = {}
  for (const m of returnMovements) {
    returnedQtyByItem[m.itemId] = (returnedQtyByItem[m.itemId] || 0) + m.quantity
  }

  return {
    invoiceNumber,
    transactions: saleTxs,
    totalAmount,
    alreadyRefunded,          // total money already refunded for this invoice
    hasExistingRefund: returnTxs.length > 0,
    createdAt: saleTxs[0].createdAt,
    description: saleTxs[0].description,
    paymentMethods: [...new Set(saleTxs.map(t => t.method))],
    items: saleMovements.map(m => ({
      itemId: m.itemId,
      name: m.item.name,
      sku: m.item.sku,
      unit: m.item.unit,
      quantitySold: Math.abs(m.quantity),
      quantityAlreadyReturned: returnedQtyByItem[m.itemId] || 0,
      sellingPrice: m.sellingPrice || m.item.sellingPrice || 0,
    })),
  }
}
