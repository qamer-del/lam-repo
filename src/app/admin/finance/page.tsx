import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getFinanceDashboardData } from '@/actions/finance'
import FinanceClient from './finance-client'

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  const session = await auth()
  const role = session?.user?.role

  if (!session || (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER')) {
    redirect('/login')
  }

  const data = await getFinanceDashboardData()

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <FinanceClient data={data} />
    </div>
  )
}
