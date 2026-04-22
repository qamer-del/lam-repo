import { prisma } from '@/lib/prisma'
import SalesClientPage from './sales-client'
import { auth } from '@/auth'
import { startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function SalesRoute() {
  const session = await auth()
  const role = session?.user?.role
  
  let whereClause: any = { type: 'SALE' }
  
  if (role === 'CASHIER') {
    whereClause.recordedById = session?.user?.id
    whereClause.createdAt = { gte: startOfDay(new Date()) }
  }

  const sales = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  })

  return <SalesClientPage initialSales={sales} />
}
