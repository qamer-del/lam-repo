import { prisma } from '@/lib/prisma'
import { getCashierPerformance } from '@/actions/transactions'
import SalesClientPage from './sales-client'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SalesRoute() {
  const session = await auth()
  const role = session?.user?.role

  // Cashiers use the dedicated POS page
  if (role === 'CASHIER') {
    redirect('/sales/pos')
  }

  const typeFilter = { in: ['SALE', 'RETURN'] }
  const baseWhere: any = { type: typeFilter }

  const [sales, unpaidCreditSales, cashierPerformance] = await Promise.all([
    prisma.transaction.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { name: true } },
        linkedBy: { select: { amount: true } },
      }
    }),
    Promise.resolve(null), // Cashiers are redirected to /sales/pos; admins have credit in main query
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
