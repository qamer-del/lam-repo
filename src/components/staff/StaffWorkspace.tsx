'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  LayoutDashboard, Calculator, CreditCard, Clock, AlertTriangle, History,
} from 'lucide-react'
import { StaffProfileHeader } from '@/components/staff/StaffProfileHeader'

// Lazy-load tab components to reduce initial bundle
const OverviewTab = dynamic(() => import('@/components/staff/tabs/OverviewTab').then(m => ({ default: m.OverviewTab })))
const PayrollTab = dynamic(() => import('@/components/staff/tabs/PayrollTab').then(m => ({ default: m.PayrollTab })))
const AdvancesTab = dynamic(() => import('@/components/staff/tabs/AdvancesTab').then(m => ({ default: m.AdvancesTab })))
const AttendanceTab = dynamic(() => import('@/components/staff/tabs/AttendanceTab').then(m => ({ default: m.AttendanceTab })))
const AbsencesTab = dynamic(() => import('@/components/staff/tabs/AbsencesTab').then(m => ({ default: m.AbsencesTab })))
const HistoryTab = dynamic(() => import('@/components/staff/tabs/HistoryTab').then(m => ({ default: m.HistoryTab })))

type StaffProfile = {
  id: number
  name: string
  idNumber: string | null
  nationality: string | null
  baseSalary: number
  safetyAllowance: number
  overtimeAllowance: number
  transportAllowance: number
  otherAllowance: number
  overtimeMultiplier: number
  monthlyHours: number
  joiningDate: Date | null
  isActive: boolean
  userId: string | null
  salarySettlements: {
    paidAt: Date
    netPaid: number
    month: number
    year: number
    settledUpToDate: Date | null
  }[]
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'payroll', label: 'Payroll', icon: Calculator },
  { id: 'advances', label: 'Advances', icon: CreditCard },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'absences', label: 'Absences', icon: AlertTriangle },
  { id: 'history', label: 'History', icon: History },
]

export function StaffWorkspace({
  staff,
  activeTab = 'overview',
}: {
  staff: StaffProfile
  activeTab?: string
}) {
  const router = useRouter()

  const handleTabChange = (tabId: string) => {
    router.push(`/staff/${staff.id}?tab=${tabId}`)
  }

  const renderTab = () => {
    const hourlyRate = staff.baseSalary / (staff.monthlyHours || 208)
    switch (activeTab) {
      case 'overview':
        return <OverviewTab staff={staff} />
      case 'payroll':
        return <PayrollTab staff={staff} />
      case 'advances':
        return <AdvancesTab staffId={staff.id} staffName={staff.name} />
      case 'attendance':
        return <AttendanceTab staffId={staff.id} staffName={staff.name} />
      case 'absences':
        return <AbsencesTab staffId={staff.id} staffName={staff.name} hourlyRate={hourlyRate} />
      case 'history':
        return <HistoryTab staffId={staff.id} staffName={staff.name} idNumber={staff.idNumber} nationality={staff.nationality} />
      default:
        return <OverviewTab staff={staff} />
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Profile header */}
      <StaffProfileHeader staff={staff} />

      {/* Tab bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-none px-4 md:px-6 gap-1 py-2">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={14} strokeWidth={2.5} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 md:p-6">
        {renderTab()}
      </div>
    </div>
  )
}
