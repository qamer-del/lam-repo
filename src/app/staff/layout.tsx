import { redirect } from 'next/navigation'
import { getStaffForSidebar } from '@/actions/staff'
import { StaffSidebar } from '@/components/staff/StaffSidebar'
import { auth } from '@/auth'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const staffList = await getStaffForSidebar()

  return (
    <div className="flex h-full" style={{ minHeight: 'calc(100vh - 0px)' }}>
      {/* Staff sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-950 overflow-hidden">
        <StaffSidebar staffList={staffList} userRole={session?.user?.role} />
      </div>

      {/* Main content — full width on mobile */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {children}
      </div>
    </div>
  )
}
