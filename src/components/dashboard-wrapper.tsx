import { getDashboardData } from '@/actions/transactions'
import { getInventorySummary } from '@/actions/inventory'
import { DashboardContent } from '@/components/dashboard-content'
import { auth } from '@/auth'

export async function DashboardWrapper() {
  const [data, inventorySummary] = await Promise.all([
    getDashboardData(),
    getInventorySummary(),
  ])
  const session = await auth()
  return (
    <DashboardContent 
      initialData={data as any} 
      userRole={session?.user?.role} 
      inventorySummary={inventorySummary} 
    />
  )
}
