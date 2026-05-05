import { prisma } from '@/lib/prisma'
import { getCashierPerformance } from '@/actions/transactions'
import SalesClientPage from './sales-client'
import { auth } from '@/auth'
import { startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function SalesRoute() {
  const session = await auth()
  const role = session?.user?.role

  const typeFilter = { in: ['SALE', 'RETURN'] }
  const baseWhere: any = { type: typeFilter }

  if (role === 'CASHIER') {
    if (session?.user?.id) {
      baseWhere.recordedById = session.user.id
    }
    baseWhere.isSettled = false
    baseWhere.settlementId = null
    baseWhere.createdAt = { gte: startOfDay(new Date()) }
  }

  const [sales, unpaidCreditSales, cashierPerformance] = await Promise.all([
    prisma.transaction.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { name: true } },
        linkedBy: { select: { amount: true } },
      }
    }),
    // Fetch ONLY the unpaid credit sales created by this specific cashier
    role === 'CASHIER'
      ? prisma.transaction.findMany({
          where: {
            type: 'SALE',
            method: 'CREDIT',
            isSettled: false,
            recordedById: session?.user?.id,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            recordedBy: { select: { name: true } },
            linkedBy: { select: { amount: true } },
          }
        })
      : Promise.resolve(null), // Admins already have credit sales in main query
    getCashierPerformance()
  ])

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

  return (
    <SalesClientPage 
      initialSales={sales} 
      initialMovements={movements} 
      userRole={role} 
      unpaidCreditSales={unpaidCreditSales} 
      cashierPerformance={cashierPerformance}
    />
  )
}
