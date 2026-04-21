import { getDashboardData } from '@/actions/transactions'
import { DashboardContent } from '@/components/dashboard-content'
import { auth } from '@/auth'

export async function DashboardWrapper() {
  const data = await getDashboardData()
  const session = await auth()
  return <DashboardContent initialData={data as any} userRole={session?.user?.role} />
}
