import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { startOfDay, subDays } from 'date-fns'
import { PosClient } from './pos-client'
import { getOrCreateActiveShift } from '@/actions/transactions'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Point of Sale | Lamaha',
  description: 'Professional POS terminal for recording sales transactions.',
}

/** Attach StockMovement items to a list of transactions */
async function attachItems(transactions: any[]) {
  const invoiceNumbers = transactions.map(t => t.invoiceNumber).filter(Boolean) as string[]
  if (invoiceNumbers.length === 0) return transactions.map(tx => ({ ...tx, items: [] }))

  const stockMovements = await prisma.stockMovement.findMany({
    where: { invoiceNumber: { in: invoiceNumbers }, type: 'SALE_OUT' },
    include: { item: { select: { name: true } } }
  })

  const itemsByInvoice = stockMovements.reduce((acc, sm) => {
    if (!sm.invoiceNumber) return acc
    if (!acc[sm.invoiceNumber]) acc[sm.invoiceNumber] = []
    acc[sm.invoiceNumber].push({
      name: sm.item?.name || 'Unknown',
      quantity: Math.abs(sm.quantity)
    })
    return acc
  }, {} as Record<string, any[]>)

  return transactions.map(tx => ({
    ...tx,
    items: tx.invoiceNumber ? itemsByInvoice[tx.invoiceNumber] || [] : []
  }))
}

export default async function PosPage() {
  const session = await auth()
  const role = session?.user?.role

  // Only cashiers use this page — all other roles go to the sales report
  if (role !== 'CASHIER') {
    redirect('/sales')
  }

  const userId = session?.user?.id
  const todayStart = startOfDay(new Date())
  const historyStart = startOfDay(subDays(new Date(), 14))

  // Fetch all data in parallel
  const [
    rawActiveShiftSales,
    closedShifts,
    inventoryItems,
    customers,
    unsettledSales,
    unpaidCreditSales,
    activeShift,
  ] = await Promise.all([
    // Active-shift transactions only (OPEN shift belonging to this user)
    userId ? prisma.transaction.findMany({
      where: {
        recordedById: userId,
        type: { in: ['SALE', 'RETURN'] },
        shift: { status: 'OPEN' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, amount: true, method: true, type: true,
        invoiceNumber: true, description: true, customerName: true,
        createdAt: true, isSettled: true, settlementId: true,
        shiftId: true,
        shift: { select: { id: true, status: true, openedAt: true, closedAt: true } },
        recordedBy: { select: { name: true } },
      },
    }) : Promise.resolve([]),

    // Closed shifts from last 14 days — summary cards only (no invoice rows loaded yet)
    userId ? prisma.shift.findMany({
      where: {
        openedById: userId,
        status: 'CLOSED',
        openedAt: { gte: historyStart },
      },
      orderBy: { openedAt: 'desc' },
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        status: true,
        cashSales: true,
        cardSales: true,
        tabbySales: true,
        tamaraSales: true,
        creditSales: true,
        totalSales: true,
        invoiceCount: true,
        expectedCash: true,
        actualCash: true,
        difference: true,
      },
    }) : Promise.resolve([]),

    prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, sku: true, unit: true,
        currentStock: true, sellingPrice: true, reorderLevel: true,
        hasWarranty: true, warrantyDuration: true, warrantyUnit: true,
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true },
    }),
    // Unsettled today (for shift totals in header widgets)
    userId ? prisma.transaction.findMany({
      where: { recordedById: userId, type: { in: ['SALE', 'RETURN'] }, isSettled: false, settlementId: null, createdAt: { gte: todayStart } },
      select: { id: true, amount: true, method: true, type: true },
    }) : Promise.resolve([]),
    // Unpaid credit sales this cashier recorded
    userId ? prisma.transaction.findMany({
      where: { recordedById: userId, type: 'SALE', method: 'CREDIT', isSettled: false },
      orderBy: { createdAt: 'desc' },
      include: { recordedBy: { select: { name: true } }, linkedBy: { select: { amount: true } } },
    }) : Promise.resolve([]),
    userId ? getOrCreateActiveShift() : Promise.resolve(null),
  ])

  // Attach product items to active-shift sales only (closed shift invoices load lazily)
  const activeShiftSales = await attachItems(rawActiveShiftSales)

  // allTodaySales kept for backward-compat (Zustand store hydration)
  const allTodaySales = activeShiftSales

  let unsettledCash = 0, unsettledNetwork = 0, unsettledTabby = 0, unsettledTamara = 0

  for (const tx of unsettledSales) {
    const sign = tx.type === 'SALE' ? 1 : -1
    if (tx.method === 'CASH') unsettledCash += sign * tx.amount
    else if (tx.method === 'NETWORK') unsettledNetwork += sign * tx.amount
    else if (tx.method === 'TABBY') unsettledTabby += sign * tx.amount
    else if (tx.method === 'TAMARA') unsettledTamara += sign * tx.amount
  }

  const hasUnsettled = unsettledSales.length > 0

  return (
    <PosClient
      inventoryItems={inventoryItems}
      customers={customers}
      cashierName={session?.user?.name || 'Cashier'}
      userRole={role || undefined}
      hasUnsettled={hasUnsettled}
      unsettledCash={unsettledCash}
      unsettledNetwork={unsettledNetwork}
      unsettledTabby={unsettledTabby}
      unsettledTamara={unsettledTamara}
      allTodaySales={allTodaySales}
      activeShiftSales={activeShiftSales}
      closedShifts={closedShifts}
      unpaidCreditSales={unpaidCreditSales}
      activeShift={activeShift}
    />
  )
}
