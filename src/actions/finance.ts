'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { startOfMonth, endOfMonth, subMonths, format, startOfYear } from 'date-fns'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinanceReportDocument } from '@/components/finance-report-document'
import React from 'react'

export async function getFinanceDashboardData(startDate?: Date, endDate?: Date) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const startOfCurrentYear = startOfYear(now)
  
  const queryRange = (startDate && endDate) 
    ? { gte: startDate, lte: endDate } 
    : { gte: startOfCurrentYear }

  // 1. Fetch all relevant data
  const [transactions, purchaseOrders, stockMovements] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        createdAt: queryRange,
        type: { in: ['SALE', 'RETURN', 'EXPENSE', 'SALARY_PAYMENT', 'AGENT_PAYMENT'] }
      },
      include: {
        recordedBy: { select: { name: true } },
        staff: { select: { name: true } },
        agent: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.purchaseOrder.findMany({
      where: { createdAt: queryRange },
      include: {
        items: { include: { item: { select: { name: true } } } },
        agent: { select: { name: true, companyName: true } },
        recordedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.stockMovement.findMany({
      where: {
        createdAt: queryRange,
        type: { in: ['SALE_OUT', 'RETURN_IN'] }
      },
      include: {
        item: { select: { name: true, unitCost: true } }
      }
    })
  ])

  // 2. Aggregate Stats
  let totalRevenue = 0
  let totalExpenses = 0
  let totalPurchases = 0
  let totalCogs = 0

  const monthlyData: Record<string, { revenue: number; expenses: number; purchases: number }> = {}

  // Process Transactions
  transactions.forEach(tx => {
    const monthKey = format(tx.createdAt, 'MMM yyyy')
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0, purchases: 0 }

    if (tx.type === 'SALE') {
      totalRevenue += tx.amount
      monthlyData[monthKey].revenue += tx.amount
    } else if (tx.type === 'RETURN') {
      totalRevenue -= tx.amount
      monthlyData[monthKey].revenue -= tx.amount
    } else if (tx.type === 'EXPENSE' || tx.type === 'SALARY_PAYMENT' || tx.type === 'AGENT_PAYMENT') {
      totalExpenses += tx.amount
      monthlyData[monthKey].expenses += tx.amount
    }
  })

  // Process Purchase Orders
  purchaseOrders.forEach(po => {
    const monthKey = format(po.createdAt, 'MMM yyyy')
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0, purchases: 0 }

    totalPurchases += po.totalCost
    monthlyData[monthKey].purchases += po.totalCost
  })

  // Process COGS
  stockMovements.forEach(move => {
    const cost = (move.unitCost || move.item.unitCost || 0) * Math.abs(move.quantity)
    if (move.type === 'SALE_OUT') {
      totalCogs += cost
    } else if (move.type === 'RETURN_IN') {
      totalCogs -= cost
    }
  })

  // 3. Format Monthly Data for Charts (Last 6 Months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i)
    const key = format(d, 'MMM yyyy')
    return {
      month: format(d, 'MMM'),
      revenue: monthlyData[key]?.revenue || 0,
      expenses: (monthlyData[key]?.expenses || 0) + (monthlyData[key]?.purchases || 0),
      net: (monthlyData[key]?.revenue || 0) - (monthlyData[key]?.expenses || 0) - (monthlyData[key]?.purchases || 0)
    }
  })

  // 4. Breakdown by Payment Method
  const methodBreakdown = transactions
    .filter(tx => tx.type === 'SALE')
    .reduce((acc, tx) => {
      acc[tx.method] = (acc[tx.method] || 0) + tx.amount
      return acc
    }, {} as Record<string, number>)

  return {
    stats: {
      totalRevenue,
      totalExpenses,
      totalPurchases,
      totalCogs,
      grossProfit: totalRevenue - totalCogs,
      netProfit: totalRevenue - totalCogs - totalExpenses,
    },
    last6Months,
    methodBreakdown,
    recentExpenses: transactions.filter(tx => tx.type === 'EXPENSE').slice(0, 50),
    recentPurchases: purchaseOrders.slice(0, 50),
    allTransactions: transactions.slice(0, 100)
  }
}

export async function generateFinanceReportAction(data: any, fromDate: string, toDate: string) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'OWNER') {
    throw new Error("Unauthorized")
  }

  // Basic translation helper for PDF
  const t = (k: string) => k

  const doc = React.createElement(FinanceReportDocument, { 
    data, 
    dateRange: { from: new Date(fromDate), to: new Date(toDate) },
    t
  })

  const buffer = await renderToBuffer(doc as any)
  return buffer.toString('base64')
}
