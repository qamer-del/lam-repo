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

  // Use allTxs (including internal corrections) for metrics calculation
  // This ensures the drawer balance reflects the actual cash movement even if corrected
  allTxs.forEach((tx: TxWithRelations) => {
    const txDate = new Date(tx.createdAt)
    const isThisMonth = txDate.getMonth() === curMonth && txDate.getFullYear() === curYear

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        cashInDrawer += tx.amount
        if (isThisMonth) monthlySalaryPool += tx.amount
      } else if (tx.method === 'NETWORK') {
        networkSales += tx.amount
      }
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH') {
        cashInDrawer -= tx.amount
        if (isThisMonth) monthlySalaryPool -= tx.amount
      }
      if (tx.method === 'NETWORK') networkSales -= tx.amount
    } else if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT'].includes(tx.type)) {
      if (tx.method === 'CASH') cashInDrawer -= tx.amount
      else if (tx.method === 'NETWORK') networkSales -= tx.amount
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
        type: 'ADVANCE',
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

  // 1. Get existing transaction
  const oldTx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { staff: true }
  })

  if (!oldTx) throw new Error("Transaction not found")

  // 2. Update the original transaction (it stays in the main ledger)
  const tx = await prisma.transaction.update({
    where: { id: transactionId },
    data: { 
      amount: newAmount,
      isInternal: true // Hide from dashboard but keep in staff records
    },
  })

  // 3. If the amount was reduced, transfer the difference to the internal correction ledger
  const diff = oldTx.amount - newAmount
  if (diff > 0) {
    await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        amount: diff,
        method: oldTx.method,
        description: `Internal Correction: ${oldTx.staff?.name || 'Staff'} advance #${transactionId} adjusted from ${oldTx.amount} to ${newAmount}`,
        isInternal: true,
        recordedById: oldTx.recordedById // Keep it in the same drawer context
      }
    })
  }

  revalidatePath('/')
  revalidatePath('/staff')
  return tx
}

export async function createSettlement() {
  // Finds all unsettled transactions and lock them into a single settlement
  const unsettled = await prisma.transaction.findMany({
    where: { isSettled: false }
  })

  type UnsettledTx = (typeof unsettled)[number]

  const cashHanded = unsettled.reduce((acc: number, tx: UnsettledTx) => {
    if (tx.type === 'SALE' && tx.method === 'CASH') return acc + tx.amount;
    if (tx.type === 'RETURN' && tx.method === 'CASH') return acc - tx.amount;
    if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT'].includes(tx.type) && tx.method === 'CASH') return acc - tx.amount;
    return acc;
  }, 0)

  const networkVolume = unsettled.reduce((acc: number, tx: UnsettledTx) => {
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

  await prisma.transaction.updateMany({
    where: { isSettled: false },
    data: { isSettled: true }
  })

  revalidatePath('/')
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

