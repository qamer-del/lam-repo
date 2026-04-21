import { prisma } from '@/lib/prisma'
import SalesClientPage from './sales-client'

export const dynamic = 'force-dynamic'

export default async function SalesRoute() {
  const sales = await prisma.transaction.findMany({
    where: { type: 'SALE' },
    orderBy: { createdAt: 'desc' }
  })

  return <SalesClientPage initialSales={sales} />
}
