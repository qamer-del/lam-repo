'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { TransType, PayMethod } from '@prisma/client'
import { createWarrantyRecordsForSale } from '@/actions/warranty'

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

  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OWNER'
  
  // If cashier, they only see their own UNSETTLED transactions.
  // Super Admin/Admin/Owner see everything.
  const whereClause = isAdmin 
    ? {} 
    : { 
        recordedById: session?.user?.id,
        settlementId: null, // Crucial: exclude transactions that are already part of a handover/report
        OR: [
          { isSettled: false },
          { salarySettlementId: { not: null } }
        ]
      }

  const allTxs = await prisma.transaction.findMany({
    where: { 
      ...whereClause,
    },
    orderBy: { createdAt: 'desc' },
    include: { staff: true, agent: true, recordedBy: { select: { name: true } }, settlement: { include: { performedBy: { select: { role: true } } } } }
  })

  // Separate for the UI
  // For cashiers, we only show what's currently in their active session (unsettled)
  const transactions = isAdmin 
    ? allTxs.filter(tx => !tx.isInternal)
    : allTxs.filter(tx => !tx.isInternal && (!tx.isSettled || tx.salarySettlementId) && !tx.settlementId)

  const internalTransactions = role === 'SUPER_ADMIN' ? allTxs.filter(tx => tx.isInternal) : []

  type TxWithRelations = (typeof allTxs)[number]

  let cashInDrawer = 0
  let networkSales = 0
  let tabbyBalance = 0
  let tamaraBalance = 0
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
    // that haven't been settled yet. Cashier handovers (which set settlementId) are
    // purely informational snapshots and do NOT affect the admin's drawer balance.
    // Only the explicit admin "Settle Cash" action clears them from the drawer.
    // Staff advances stay isSettled: false, but they ARE cleared from the drawer once they 
    // are part of an Admin Settlement.
    const isClearedByAdmin = tx.settlementId && tx.settlement?.performedBy?.role && 
      ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(tx.settlement.performedBy.role)
    
    const isStaffRelated = tx.type === 'ADVANCE' || tx.type === 'SALARY_PAYMENT' || (tx.type === 'EXPENSE' && tx.staffId !== null)
    
    // Staff-related transactions stay active in the drawer until explicitly cleared by an ADMIN settlement,
    // even if marked isSettled: true (which happens during monthly salary settlement).
    const isActiveInDrawer = isStaffRelated 
      ? !isClearedByAdmin 
      : !tx.isSettled && !isClearedByAdmin

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        if (isActiveInDrawer) cashInDrawer += tx.amount
        if (isThisMonth) monthlySalaryPool += tx.amount
      } else if (tx.method === 'NETWORK') {
        if (isActiveInDrawer) networkSales += tx.amount
      } else if (tx.method === 'TABBY') {
        if (isActiveInDrawer) tabbyBalance += tx.amount
      } else if (tx.method === 'TAMARA') {
        if (isActiveInDrawer) tamaraBalance += tx.amount
      } else if (tx.method === 'CREDIT' && !tx.isSettled) {
        totalOutstandingCredit += tx.amount
      }
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH') {
        if (isActiveInDrawer) cashInDrawer -= tx.amount
        if (isThisMonth) monthlySalaryPool -= tx.amount
      }
      if (tx.method === 'NETWORK' && isActiveInDrawer) networkSales -= tx.amount
      if (tx.method === 'TABBY' && isActiveInDrawer) tabbyBalance -= tx.amount
      if (tx.method === 'TAMARA' && isActiveInDrawer) tamaraBalance -= tx.amount
    } else if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'AGENT_PURCHASE', 'SALARY_PAYMENT'].includes(tx.type)) {
      if (tx.method === 'CASH' && isActiveInDrawer) cashInDrawer -= tx.amount
      else if (tx.method === 'NETWORK' && isActiveInDrawer) networkSales -= tx.amount
      else if (tx.method === 'TABBY' && isActiveInDrawer) tabbyBalance -= tx.amount
      else if (tx.method === 'TAMARA' && isActiveInDrawer) tamaraBalance -= tx.amount
      
      // Keep track of total payouts for the monthly salary pool
      if (isStaffRelated && isThisMonth) salaryPayouts += tx.amount
    }
  })

  // Final available pool is total monthly sales minus what was paid out as salary
  const salaryFundRemaining = monthlySalaryPool - salaryPayouts

  return {
    cashInDrawer,
    networkSales,
    tabbyBalance,
    tamaraBalance,
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
  
  // Return with relations needed for the store
  return await prisma.transaction.findUnique({
    where: { id: tx.id },
    include: { recordedBy: { select: { name: true } } }
  })
}

export async function settleSalary(data: { staffId: number, month: number, year: number, method: 'CASH' | 'NETWORK', deductOverdueCredit?: boolean }) {
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

  let totalAdvances = staff.transactions.reduce((sum, tx) => sum + tx.amount, 0)
  
  let totalOverdueRemaining = 0
  const deductionsToMake: { tx: any, remaining: number }[] = []

  if (data.deductOverdueCredit && staff.userId) {
    const overdueCredits = await prisma.transaction.findMany({
      where: {
        type: 'SALE',
        method: 'CREDIT',
        isSettled: false,
        recordedById: staff.userId,
        OR: [
          { dueDate: { lt: new Date() } },
          { dueDate: null } // Handle older invoices created before we added the dueDate field
        ]
      },
      include: { linkedBy: { select: { amount: true } } }
    })

    for (const creditTx of overdueCredits) {
      const paidSoFar = creditTx.linkedBy.reduce((sum: number, p: any) => sum + p.amount, 0)
      const remaining = creditTx.amount - paidSoFar
      if (remaining > 0.01) {
        totalOverdueRemaining += remaining
        deductionsToMake.push({ tx: creditTx, remaining })
      }
    }
  }

  const finalAdvancesTally = totalAdvances + totalOverdueRemaining
  // Calculate total salary (base + allowances)
  const totalSalary = staff.baseSalary + (staff.overtimeAllowance || 0) + (staff.transportAllowance || 0) + (staff.otherAllowance || 0)
  const netPaid = totalSalary - finalAdvancesTally

  // 2. Create SalarySettlement record
  const salarySettlement = await prisma.salarySettlement.create({
    data: {
      staffId: data.staffId,
      month: data.month,
      year: data.year,
      baseSalary: totalSalary, // Saving the total calculated salary instead of just baseSalary for accuracy in reports
      advancesTally: finalAdvancesTally,
      netPaid: netPaid,
      method: data.method,
      transactions: {
        connect: staff.transactions.map(tx => ({ id: tx.id }))
      }
    }
  })

  // 2b. If we have overdue credits to deduct, record the deduction and payment transactions
  if (totalOverdueRemaining > 0) {
    // Record the deduction on the staff ledger
    const deductionTx = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        amount: totalOverdueRemaining,
        method: 'CASH', // Deduction from payout
        description: `[DEDUCTION] Automatic deduction for ${deductionsToMake.length} overdue credit invoice(s)`,
        staffId: staff.id,
        recordedById: session.user.id,
        isSettled: true,
        salarySettlementId: salarySettlement.id
      }
    })

    // Update the salary settlement to include this new deduction transaction
    await prisma.salarySettlement.update({
      where: { id: salarySettlement.id },
      data: {
        transactions: {
          connect: { id: deductionTx.id }
        }
      }
    })

    // Record payments for each overdue invoice
    for (const { tx, remaining } of deductionsToMake) {
      await prisma.transaction.create({
        data: {
          type: 'SALE',
          amount: remaining,
          method: data.method,
          description: `[SETTLEMENT] Paid via Staff Salary Deduction (${staff.name})`,
          recordedById: session.user.id,
          linkedTransactionId: tx.id,
          invoiceNumber: tx.invoiceNumber,
          customerName: tx.customerName,
          customerPhone: tx.customerPhone,
          customerId: tx.customerId,
          isSettled: true // No need to be physically settled again
        }
      })
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { isSettled: true }
      })
    }
  }

  // 3. Record final SALARY_PAYMENT if netPaid > 0
  let paymentTransaction = null
  if (netPaid > 0) {
    paymentTransaction = await prisma.transaction.create({
      data: {
        type: 'SALARY_PAYMENT',
        amount: netPaid,
        method: data.method,
        description: `Final payout for period ${data.month}/${data.year}`,
        staffId: data.staffId,
        recordedById: session.user.id,
        isSettled: true,
        salarySettlementId: salarySettlement.id
      },
      include: { recordedBy: { select: { name: true } } }
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
  return { ...salarySettlement, paymentTransaction }
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

  // Finds all unsettled transactions. Transactions may already have a settlementId
  // from a cashier handover (informational snapshot), but they remain active in the drawer
  // until this explicit admin settlement.
  console.log('[createSettlement] Fetching unsettled transactions...')
  const unsettled = await prisma.transaction.findMany({
    where: { 
      AND: [
        {
          OR: [
            { isSettled: false },
            { salarySettlementId: { not: null } }
          ]
        },
        {
          OR: [
            { settlementId: null },
            { settlement: { performedBy: { role: 'CASHIER' } } }
          ]
        }
      ]
    },
    include: {
      settlement: { include: { performedBy: { select: { role: true } } } }
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

export async function createCashierHandover(actualCashCounted: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Finds all unsettled transactions recorded by THIS user
  const unsettled = await prisma.transaction.findMany({
    where: { 
      OR: [
        { isSettled: false },
        { salarySettlementId: { not: null } }
      ],
      settlementId: null,
      recordedById: session.user.id
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

  // Cashier handover is a SNAPSHOT-ONLY operation.
  // We do NOT mark transactions as isSettled: true here.
  // The settlementId link is enough to:
  //   1. Remove them from the cashier's active session view (query filters settlementId: null)
  //   2. Keep them visible in the admin dashboard as unsettled cash until explicit admin settlement
  // Credit transactions are also untouched — they remain outstanding until explicit payment collection.

  revalidatePath('/')
  revalidatePath('/sales')
  return settlement
}


export async function recordDailySales(data: {
  paymentMode: 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA' | 'CREDIT'
  totalAmount: number
  cashAmount?: number
  networkAmount?: number
  description?: string
  consumedItems?: { itemId: number; quantity: number }[]
  customerId?: number
  customerName?: string
  customerPhone?: string
  dueDate?: Date
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
    customerId?: number
    customerName?: string
    customerPhone?: string
    dueDate?: Date
  }

  const exactTime = new Date()
  const invoiceNumber = `INV-${Date.now()}` // Generate a unique serial number
  const transactions: SaleTx[] = []

  // Shared customer fields for any payment method
  const customerFields = {
    ...(data.customerId && { customerId: data.customerId }),
    ...(data.customerName && { customerName: data.customerName }),
    ...(data.customerPhone && { customerPhone: data.customerPhone }),
  }

  if (data.paymentMode === 'SPLIT') {
    const cashAmt = data.cashAmount ?? 0
    const netAmt = data.networkAmount ?? data.totalAmount - cashAmt
    if (cashAmt > 0) {
      transactions.push({ type: 'SALE', method: 'CASH', amount: cashAmt, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber, ...customerFields })
    }
    if (netAmt > 0) {
      transactions.push({ type: 'SALE', method: 'NETWORK', amount: netAmt, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber, ...customerFields })
    }
  } else if (data.paymentMode === 'TABBY') {
    transactions.push({ type: 'SALE', method: 'TABBY', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber, ...customerFields })
  } else if (data.paymentMode === 'TAMARA') {
    transactions.push({ type: 'SALE', method: 'TAMARA', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber, ...customerFields })
  } else if (data.paymentMode === 'NETWORK') {
    transactions.push({ type: 'SALE', method: 'NETWORK', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber, ...customerFields })
  } else if (data.paymentMode === 'CREDIT') {
    if (!data.customerId && (!data.customerName || !data.customerPhone)) throw new Error('Customer is required for credit sales.')
    const dueDate = new Date(exactTime.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default
    transactions.push({ 
      type: 'SALE', 
      method: 'CREDIT', 
      amount: data.totalAmount, 
      description: data.description, 
      recordedById: session.user.id, 
      createdAt: exactTime, 
      invoiceNumber,
      dueDate,
      ...customerFields,
    })
  } else {
    transactions.push({ type: 'SALE', method: 'CASH', amount: data.totalAmount, description: data.description, recordedById: session.user.id, createdAt: exactTime, invoiceNumber, ...customerFields })
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

  // Auto-create warranty records for items that have warranty configured
  const warrantyItems = data.consumedItems?.filter(ci => ci.quantity > 0) || []
  if (warrantyItems.length > 0) {
    try {
      await createWarrantyRecordsForSale({
        invoiceNumber,
        saleDate: exactTime,
        items: warrantyItems,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      })
    } catch (err) {
      // Non-fatal: log but don't fail the sale
      console.error('[recordDailySales] Failed to create warranty records:', err)
    }
  }

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/inventory')

  // Return the created transactions with relations for real-time store update
  return await prisma.transaction.findMany({
    where: { invoiceNumber },
    include: { recordedBy: { select: { name: true } } }
  })
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

/**
 * Collect a payment (full or partial) against a customer's outstanding credit invoices.
 * Allocates payment FIFO — oldest invoices first.
 */
export async function collectCreditPayment(data: {
  customerId?: number
  customerName?: string
  customerPhone?: string
  amount: number
  paymentMethod: 'CASH' | 'NETWORK'
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!data.amount || data.amount <= 0) throw new Error("Amount must be greater than zero")

  // Build customer filter — by ID if available, otherwise by name+phone combo
  const customerFilter = data.customerId
    ? { customerId: data.customerId }
    : { customerName: data.customerName, customerPhone: data.customerPhone }

  // Get all unpaid credit invoices for this customer, oldest first, with existing payments
  const unpaidInvoices = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      method: 'CREDIT',
      isSettled: false,
      ...customerFilter,
      // Cashiers can only collect payment for their own invoices
      ...(session.user.role === 'CASHIER' ? { recordedById: session.user.id } : {})
    },
    orderBy: { createdAt: 'asc' },
    include: {
      linkedBy: { select: { amount: true } }
    }
  })

  if (unpaidInvoices.length === 0) throw new Error("No outstanding invoices found for this customer")

  // Calculate remaining balance per invoice
  const invoicesWithBalance = unpaidInvoices.map(inv => ({
    ...inv,
    paidSoFar: inv.linkedBy.reduce((sum, p) => sum + p.amount, 0),
    remaining: inv.amount - inv.linkedBy.reduce((sum, p) => sum + p.amount, 0),
  })).filter(inv => inv.remaining > 0.01) // Only invoices with actual remaining balance

  const totalOutstanding = invoicesWithBalance.reduce((sum, inv) => sum + inv.remaining, 0)
  if (data.amount > totalOutstanding + 0.01) {
    throw new Error(`Payment amount (${data.amount}) exceeds total outstanding (${totalOutstanding.toFixed(2)})`)
  }

  // FIFO allocation
  let remaining = data.amount
  const allocations: { invoiceId: number; portion: number; fullyCovered: boolean; invoice: typeof invoicesWithBalance[0] }[] = []

  for (const inv of invoicesWithBalance) {
    if (remaining <= 0.01) break

    const portion = Math.min(remaining, inv.remaining)
    const fullyCovered = (inv.remaining - portion) < 0.01
    allocations.push({ invoiceId: inv.id, portion, fullyCovered, invoice: inv })
    remaining -= portion
  }

  // Execute all DB operations atomically
  const results = await prisma.$transaction(async (tx) => {
    const paymentTxs = []

    for (const alloc of allocations) {
      // Create payment transaction linked to the credit invoice
      const paymentTx = await tx.transaction.create({
        data: {
          type: 'SALE',
          amount: alloc.portion,
          method: data.paymentMethod,
          description: `[CREDIT_PAYMENT] Payment for Invoice ${alloc.invoice.invoiceNumber || alloc.invoiceId}. Customer: ${alloc.invoice.customerName || 'N/A'}`,
          recordedById: session.user.id,
          linkedTransactionId: alloc.invoiceId,
          invoiceNumber: alloc.invoice.invoiceNumber,
          customerName: alloc.invoice.customerName,
          customerPhone: alloc.invoice.customerPhone,
          customerId: alloc.invoice.customerId,
          isSettled: false, // Unsettled until cash handover / admin settlement
        }
      })
      paymentTxs.push(paymentTx)

      // Mark credit invoice as settled only if fully paid
      if (alloc.fullyCovered) {
        await tx.transaction.update({
          where: { id: alloc.invoiceId },
          data: { isSettled: true }
        })
      }
    }

    return paymentTxs
  })

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/customers')
  return { paymentCount: results.length, totalCollected: data.amount }
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
    prisma.transaction.findMany({ 
      where: { invoiceNumber, type: 'SALE' },
      include: { recordedBy: { select: { name: true } } }
    }),
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
    salesperson: saleTxs[0].recordedBy?.name || 'Unknown',
    customerName: saleTxs[0].customerName || null,
    customerPhone: saleTxs[0].customerPhone || null,
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
export async function settleTabbySales() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  await prisma.transaction.updateMany({
    where: { method: 'TABBY', isSettled: false },
    data: { isSettled: true }
  })
  revalidatePath('/')
}

export async function settleTamaraSales() {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') throw new Error("Unauthorized")

  await prisma.transaction.updateMany({
    where: { method: 'TAMARA', isSettled: false },
    data: { isSettled: true }
  })
  revalidatePath('/')
}

export async function getCashierPerformance() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    return []
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch all active users who have recorded any transaction in the current month
  const users = await prisma.user.findMany({
    where: { 
      isActive: true,
      OR: [
        { role: 'CASHIER' },
        { records: { some: { type: 'SALE', createdAt: { gte: startOfMonth } } } }
      ]
    },
    select: {
      id: true,
      name: true,
      records: {
        where: {
          type: { in: ['SALE', 'RETURN'] },
          createdAt: { gte: startOfMonth }
        },
        select: {
          type: true,
          amount: true,
          createdAt: true
        }
      }
    }
  })

  return users.map(user => {
    const todayTxs = user.records.filter(r => r.createdAt >= startOfDay)
    
    const dailySales = todayTxs.reduce((sum, r) => {
      return r.type === 'SALE' ? sum + r.amount : sum - r.amount
    }, 0)
    
    const monthlySales = user.records.reduce((sum, r) => {
      return r.type === 'SALE' ? sum + r.amount : sum - r.amount
    }, 0)

    return {
      id: user.id,
      name: user.name,
      dailySales,
      monthlySales
    }
  }).filter(u => u.dailySales > 0 || u.monthlySales > 0)
}
