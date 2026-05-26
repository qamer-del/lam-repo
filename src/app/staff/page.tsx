import { redirect } from 'next/navigation'
import { getStaffForSidebar } from '@/actions/staff'

export default async function StaffPage() {
  const staffList = await getStaffForSidebar()

  if (staffList.length > 0) {
    redirect(`/staff/${staffList[0].id}`)
  }

  // Empty state — no staff members yet
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Staff Members Yet</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
        Add your first employee to start managing payroll, advances, and attendance records.
      </p>
    </div>
  )
}
