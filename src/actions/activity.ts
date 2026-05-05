'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { TransType, PayMethod } from '@prisma/client'

export interface ActivityFilter {
  type?: 'ALL' | 'SALE' | 'RETURN' | 'SETTLEMENT'
  dateRange?: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export async function getActivityData(filters: ActivityFilter = {}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const { type = 'ALL', dateRange = 'TODAY', page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  const now = new Date()
  let start = new Date()
  let end = new Date()

  switch (dateRange) {
    case 'TODAY':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'YESTERDAY':
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(now.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'THIS_WEEK':
      const day = now.getDay()
      start.setDate(now.getDate() - day)
      start.setHours(0, 0, 0, 0)
      break
    case 'THIS_MONTH':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'CUSTOM':
      if (filters.startDate) start = new Date(filters.startDate)
      if (filters.endDate) end = new Date(filters.endDate)
      break
  }

  const where: any = {
    createdAt: {
      gte: start,
      lte: end
    }
  }

  if (type !== 'ALL') {
    if (type === 'SETTLEMENT') {
      // Settlements are not transactions directly in this schema? 
      // Actually settlements are a separate table.
      // If the user wants settlements in activity, we might need a union or separate query.
    } else {
      where.type = type as TransType
    }
  }

  // Handle Settlements separately if needed
  if (type === 'SETTLEMENT') {
    const settlements = await prisma.settlement.findMany({
      where: {
        reportDate: {
          gte: start,
          lte: end
        }
      },
      orderBy: { reportDate: 'desc' },
      skip,
      take: limit,
      include: {
        performedBy: { select: { name: true } }
      }
    })

    return {
      data: settlements.map(s => ({
        id: s.id,
        type: 'SETTLEMENT',
        title: 'Shift Closure / Settlement',
        amount: s.actualCashCounted,
        user: s.performedBy?.name || 'System',
        timestamp: s.reportDate,
        status: 'COMPLETED'
      })),
      total: await prisma.settlement.count({ where: { reportDate: { gte: start, lte: end } } })
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      recordedBy: { select: { name: true } }
    }
  })

  const total = await prisma.transaction.count({ where })

  return {
    data: transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      title: tx.type === 'SALE' ? 'Sale Completed' : tx.type === 'RETURN' ? 'Refund Processed' : tx.type,
      amount: tx.amount,
      user: tx.recordedBy?.name || 'System',
      timestamp: tx.createdAt,
      status: 'SUCCESS',
      description: tx.description,
      method: tx.method
    })),
    total
  }
}
