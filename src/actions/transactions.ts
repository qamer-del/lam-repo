'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function addTransaction(data: {
  type: 'SALE' | 'EXPENSE' | 'ADVANCE' | 'OWNER_WITHDRAWAL'
  amount: number
  method: 'CASH' | 'NETWORK'
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
    // that haven't been settled yet AND haven't been handed over in a settlement report.
    const isActiveInDrawer = !tx.isSettled && tx.settlementId === null

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        if (isActiveInDrawer) cashInDrawer += tx.amount
        if (isThisMonth) monthlySalaryPool += tx.amount
      } else if (tx.method === 'NETWORK') {
        if (isActiveInDrawer) networkSales += tx.amount
      }
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH') {
        if (isActiveInDrawer) cashInDrawer -= tx.amount
        if (isThisMonth) monthlySalaryPool -= tx.amount
      }
      if (tx.method === 'NETWORK' && isActiveInDrawer) networkSales -= tx.amount
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
    transactions,
    allStaffTransactions: allTxs, // Complete list including internal corrections
    internalTransactions // Passed to the client for Super Admin view
  }
}

export async function recordRefund(data: {
  amount: number
  method: 'CASH' | 'NETWORK'
  description?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const tx = await prisma.transaction.create({
    data: {
      type: 'RETURN',
      amount: data.amount,
      method: data.method,
      description: data.description,
      recordedById: session.user.id
    }
  })
  
  revalidatePath('/')
  revalidatePath('/sales')
  return tx
}

export async function settleSalary(data: { staffId: number, month: number, year: number, method: 'CASH' | 'NETWORK' }) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
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

export async function createSettlement() {
  // Finds all unsettled transactions that haven't been part of a cash settlement report yet
  const unsettled = await prisma.transaction.findMany({
    where: { 
      isSettled: false,
      settlementId: null
    }
  })

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
      totalNetworkVolume: networkVolume,
      transactions: {
        connect: unsettled.map((t: UnsettledTx) => ({ id: t.id }))
      }
    }
  })

  // Mark as settled ONLY if they are not staff-related.
  // Staff ADVANCE and staff-linked EXPENSE must stay isSettled: false 
  // so they can be settled later in the monthly Staff Salary workflow.
  await prisma.transaction.updateMany({
    where: { 
      id: { in: unsettled.map((t: UnsettledTx) => t.id) },
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
  totalAmount: number
  cashAmount: number
  networkAmount: number
  description?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  type SaleTx = {
    type: 'SALE'
    method: 'CASH' | 'NETWORK'
    amount: number
    description?: string
    recordedById: string
    createdAt: Date
  }
  const transactions: SaleTx[] = []
  const exactTime = new Date()
  
  if (data.cashAmount > 0) {
    transactions.push({
      type: 'SALE' as const,
      method: 'CASH' as const,
      amount: data.cashAmount,
      description: data.description,
      recordedById: session.user.id,
      createdAt: exactTime
    })
  }

  if (data.networkAmount > 0) {
    transactions.push({
      type: 'SALE' as const,
      method: 'NETWORK' as const,
      amount: data.networkAmount,
      description: data.description,
      recordedById: session.user.id,
      createdAt: exactTime
    })
  }

  if (transactions.length > 0) {
    await prisma.transaction.createMany({
      data: transactions
    })
    revalidatePath('/')
    revalidatePath('/sales')
  }
}

