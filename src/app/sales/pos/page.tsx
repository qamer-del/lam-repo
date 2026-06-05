import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { startOfDay } from 'date-fns'
import { PosClient } from './pos-client'
import { getOrCreateActiveShift } from '@/actions/transactions'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Point of Sale | Lamaha',
  description: 'Professional POS terminal for recording sales transactions.',
}

export default async function PosPage() {
  const session = await auth()
  const role = session?.user?.role

  // Only cashiers use this page — all other roles go to the sales report
  if (role !== 'CASHIER') {
    redirect('/sales')
  }

  const userId = session?.user?.id

  const rawAllTodaySales = userId ? await prisma.transaction.findMany({
    where: { recordedById: userId, type: { in: ['SALE', 'RETURN'] }, createdAt: { gte: startOfDay(new Date()) } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, amount: true, method: true, type: true,
      invoiceNumber: true, description: true, customerName: true,
      createdAt: true, isSettled: true, settlementId: true,
      shiftId: true,
      shift: {
        select: {
          id: true,
          status: true,
          openedAt: true,
          closedAt: true,
        }
      },
      recordedBy: { select: { name: true } },
    },
  }) : []

  const invoiceNumbers = rawAllTodaySales.map(t => t.invoiceNumber).filter(Boolean) as string[]
  const stockMovements = userId && invoiceNumbers.length > 0 ? await prisma.stockMovement.findMany({
    where: { invoiceNumber: { in: invoiceNumbers }, type: 'SALE_OUT' },
    include: { item: { select: { name: true } } }
  }) : []
  
  const itemsByInvoice = stockMovements.reduce((acc, sm) => {
    if (!sm.invoiceNumber) return acc
    if (!acc[sm.invoiceNumber]) acc[sm.invoiceNumber] = []
    acc[sm.invoiceNumber].push({
      name: sm.item?.name || 'Unknown',
      quantity: Math.abs(sm.quantity)
    })
    return acc
  }, {} as Record<string, any[]>)

  const allTodaySales = rawAllTodaySales.map(tx => ({
    ...tx,
    items: tx.invoiceNumber ? itemsByInvoice[tx.invoiceNumber] || [] : []
  }))

  const [inventoryItems, customers, unsettledSales, unpaidCreditSales, activeShift] = await Promise.all([
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
    // Unsettled today (for shift totals)
    userId ? prisma.transaction.findMany({
      where: { recordedById: userId, type: { in: ['SALE', 'RETURN'] }, isSettled: false, settlementId: null, createdAt: { gte: startOfDay(new Date()) } },
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
      unpaidCreditSales={unpaidCreditSales}
      activeShift={activeShift}
    />
  )
}
