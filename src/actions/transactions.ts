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

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: { staff: true, agent: true }
  })

  type TxWithRelations = (typeof transactions)[number]

  let cashInDrawer = 0
  let networkSales = 0
  let totalStaffDebt = 0

  transactions.forEach((tx: TxWithRelations) => {
    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') cashInDrawer += tx.amount
      else if (tx.method === 'NETWORK') networkSales += tx.amount
    } else if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT'].includes(tx.type)) {
      if (tx.method === 'CASH') cashInDrawer -= tx.amount
    } else if (tx.type === 'AGENT_PURCHASE') {
      // credit purchase doesn't affect standard cash register
    }

    if (tx.type === 'ADVANCE' && !tx.isSettled) {
      totalStaffDebt += tx.amount
    }
  })

  return {
    cashInDrawer,
    networkSales,
    totalStaffDebt,
    transactions,
  }
}

export async function editAdvance(transactionId: number, newAmount: number) {
  const session = await auth()
  
  if (session?.user?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized. Only Super Admins can modify advances.')
  }

  const tx = await prisma.transaction.update({
    where: { id: transactionId },
    data: { amount: newAmount },
  })

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
    if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL'].includes(tx.type) && tx.method === 'CASH') return acc - tx.amount;
    return acc;
  }, 0)

  const settlement = await prisma.settlement.create({
    data: {
      totalCashHanded: cashHanded,
      transactions: {
        connect: unsettled.map(t => ({ id: t.id }))
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

  const transactions = []
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

