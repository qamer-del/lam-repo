'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function addTransaction(data: {
  type: 'SALE' | 'EXPENSE' | 'ADVANCE' | 'OWNER_WITHDRAWAL' | 'RETURN' | 'SALARY_PAYMENT' | 'AGENT_PURCHASE' | 'AGENT_PAYMENT'
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
      fundAmount: data.amount,
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

  const transactions = await prisma.transaction.findMany({
    where: { 
      ...whereClause,
      isInternal: false // Default dashboard view excludes internal adjustments
    },
    orderBy: { createdAt: 'desc' },
    include: { staff: true, agent: true }
  })

  // If Super Admin, also fetch internal adjustments for their private view
  const internalTransactions = role === 'SUPER_ADMIN' ? await prisma.transaction.findMany({
    where: { isInternal: true },
    orderBy: { createdAt: 'desc' },
    include: { staff: true, agent: true }
  }) : []

  type TxWithRelations = (typeof transactions)[number]

  let cashInDrawer = 0
  let networkSales = 0
  let monthlySalaryPool = 0
  let salaryPayouts = 0
  
  const now = new Date()
  const curMonth = now.getMonth()
  const curYear = now.getFullYear()

  transactions.forEach((tx: TxWithRelations) => {
    const txDate = new Date(tx.createdAt)
    const isThisMonth = txDate.getMonth() === curMonth && txDate.getFullYear() === curYear
    
    // Ledger values: 
    // tx.amount = Physical (Drawer)
    // tx.fundAmount = Accounting (Salary Fund) - Fallback to amount for legacy records
    const fundAmount = tx.fundAmount || tx.amount

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        cashInDrawer += tx.amount
        if (isThisMonth) monthlySalaryPool += fundAmount
      } else if (tx.method === 'NETWORK') {
        networkSales += tx.amount
      }
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH') {
        cashInDrawer -= tx.amount
        if (isThisMonth) monthlySalaryPool -= fundAmount
      }
      if (tx.method === 'NETWORK') networkSales -= tx.amount
    } else if (tx.type === 'ADVANCE') {
      if (tx.method === 'CASH') cashInDrawer -= tx.amount
      // Advances also deduct from the Salary Fund
      if (isThisMonth && tx.method === 'CASH') salaryPayouts += fundAmount
    } else if (['EXPENSE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT'].includes(tx.type)) {
      if (tx.method === 'CASH') cashInDrawer -= tx.amount
      else if (tx.method === 'NETWORK') networkSales -= tx.amount
    } else if (tx.type === 'SALARY_PAYMENT') {
      // Per user request, salary settlements are from a dedicated fund and don't affect standard cash account
      if (isThisMonth) salaryPayouts += fundAmount
    }
  })

  // Final available pool is total monthly sales minus what was paid out as salary
  const salaryFundRemaining = monthlySalaryPool - salaryPayouts

  return {
    cashInDrawer,
    networkSales,
    salaryFundRemaining,
    transactions,
    internalTransactions // Passed to the client for Super Admin view
  }
}

export async function recordDailySales(data: {
  totalAmount: number
  cashAmount: number
  networkAmount: number
  description?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const exactTime = new Date()
  
  if (data.cashAmount > 0) {
    await prisma.transaction.create({
      data: {
        type: 'SALE',
        method: 'CASH',
        amount: data.cashAmount,
        fundAmount: data.cashAmount,
        description: data.description,
        recordedById: session.user.id,
        createdAt: exactTime
      }
    })
  }

  if (data.networkAmount > 0) {
    await prisma.transaction.create({
      data: {
        type: 'SALE',
        method: 'NETWORK',
        amount: data.networkAmount,
        fundAmount: data.networkAmount,
        description: data.description,
        recordedById: session.user.id,
        createdAt: exactTime
      }
    })
  }

  revalidatePath('/')
  revalidatePath('/sales')
  return { success: true }
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
      fundAmount: data.amount,
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

  const totalAdvances = staff.transactions.reduce((sum, tx) => {
    const val = tx.fundAmount || tx.amount
    return sum + val
  }, 0)
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
        fundAmount: netPaid,
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

  const tx = await prisma.transaction.update({
    where: { id: transactionId },
    data: { 
      fundAmount: newAmount, 
      isInternal: false 
    },
  })

  revalidatePath('/')
  revalidatePath('/staff')
  return tx
}

export async function createSettlement() {
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

