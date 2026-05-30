import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { PayrollReportsClient } from '@/components/staff/PayrollReportsClient'
import { getActiveStaffList } from '@/actions/payroll-reports'

export const metadata: Metadata = {
  title: 'Payroll Reports | Lam ERP',
}

export default async function PayrollReportsPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN')) {
    redirect('/staff')
  }

  const staffList = await getActiveStaffList()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 font-sans p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Payroll Reports
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-2 max-w-2xl">
          Comprehensive payroll analytics, attendance tracking, and advance deductions across the organization.
        </p>
      </div>

      <PayrollReportsClient staffList={staffList} />
    </div>
  )
}
