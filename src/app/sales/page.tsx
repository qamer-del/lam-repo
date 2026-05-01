import { prisma } from '@/lib/prisma'
import SalesClientPage from './sales-client'
import { auth } from '@/auth'
import { startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function SalesRoute() {
  const session = await auth()
  const role = session?.user?.role

  // Fetch both SALE and RETURN types so refunds appear in the table
  const typeFilter = role === 'CASHIER'
    ? { in: ['SALE', 'RETURN'] as const }
    : { in: ['SALE', 'RETURN'] as const }

  const baseWhere: any = { type: typeFilter }

  if (role === 'CASHIER') {
    baseWhere.recordedById = session?.user?.id
    baseWhere.isSettled = false
    baseWhere.settlementId = null
    baseWhere.createdAt = { gte: startOfDay(new Date()) }
  }

  const sales = await prisma.transaction.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    include: { recordedBy: { select: { name: true } } }
  })

  // Also fetch stock movements for profit calculation
  const invoiceNumbers = [
    ...new Set(sales.map(s => s.invoiceNumber).filter(Boolean) as string[]),
  ]

  const movements = await prisma.stockMovement.findMany({
    where: {
      invoiceNumber: { in: invoiceNumbers },
      type: { in: ['SALE_OUT', 'RETURN_IN'] },
    },
    include: {
      item: { select: { unitCost: true } },
    },
  })

  return <SalesClientPage initialSales={sales} initialMovements={movements} userRole={role} />
}
