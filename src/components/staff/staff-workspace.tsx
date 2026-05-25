'use client'

import { useState } from 'react'
import { StaffSidebar } from './staff-sidebar'
import { StaffProfileHeader } from './staff-profile-header'
import { OverviewTab } from './tabs/overview-tab'
import { PayrollTab } from './tabs/payroll-tab'
import { AdvancesTab } from './tabs/advances-tab'
import { AttendanceTab } from './tabs/attendance-tab'
import { AbsencesTab } from './tabs/absences-tab'
import { HistoryTab } from './tabs/history-tab'
import { TransactionsTab } from './tabs/transactions-tab'
import { FileText, Wallet, Receipt, Clock, CalendarOff, History, ArrowRight, LayoutDashboard } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getStaffListSummary } from '@/actions/staff'

type StaffSummary = {
  id: number
  name: string
  baseSalary: number
  totalMonthlySalary: number
  unsettledAdvancesTotal: number
  isActive: boolean
}

interface StaffWorkspaceProps {
  initialStaffList: StaffSummary[]
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'payroll', label: 'Payroll', icon: Wallet },
  { id: 'advances', label: 'Advances', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'absences', label: 'Absences', icon: CalendarOff },
  { id: 'history', label: 'History', icon: History },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
] as const

type TabId = typeof TABS[number]['id']

export function StaffWorkspace({ initialStaffList }: StaffWorkspaceProps) {
  const { data: session } = useSession()
  const [staffList, setStaffList] = useState<StaffSummary[]>(initialStaffList)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const reloadStaffList = async () => {
    try {
      const data = await getStaffListSummary()
      setStaffList(data)
    } catch (e) {
      console.error(e)
    }
  }

  const selectedStaffSummary = staffList.find(s => s.id === selectedId)

  return (
    <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] w-full overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl">
      
      {/* Sidebar */}
      <div className={`w-full md:w-[280px] lg:w-[320px] shrink-0 h-full flex flex-col transition-transform duration-300 ease-in-out absolute md:relative z-20 bg-white dark:bg-gray-950 ${selectedId && !isSidebarOpen ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <StaffSidebar 
          staffList={staffList} 
          selectedId={selectedId} 
          onSelect={(id) => { setSelectedId(id); setIsSidebarOpen(false); }} 
          onStaffAdded={reloadStaffList} 
        />
      </div>

      {/* Main Workspace */}
      <div className={`flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 w-full absolute md:relative z-10 transition-transform duration-300 ${!selectedId || isSidebarOpen ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        {selectedId && selectedStaffSummary ? (
          <>
            {/* Mobile Header to toggle sidebar */}
            <div className="md:hidden flex items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <button onClick={() => setIsSidebarOpen(true)} className="flex items-center text-sm font-bold text-blue-600">
                <ArrowRight className="rotate-180 mr-2" size={16} /> Back to Staff List
              </button>
            </div>

            <StaffProfileHeader staffId={selectedId} onRefresh={reloadStaffList} onSettled={reloadStaffList} />

            {/* Tab Navigation */}
            <div className="px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex gap-6 min-w-max">
                {TABS.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 border-b-2 transition-colors font-bold text-sm ${
                        isActive 
                          ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="max-w-4xl mx-auto pb-10">
                {activeTab === 'overview' && <OverviewTab staffId={selectedId} unsettledAdvancesTotal={selectedStaffSummary.unsettledAdvancesTotal} />}
                {activeTab === 'payroll' && <PayrollTab staff={selectedStaffSummary} onSettled={reloadStaffList} />}
                {activeTab === 'advances' && <AdvancesTab staffId={selectedId} staffName={selectedStaffSummary.name} />}
                {activeTab === 'attendance' && <AttendanceTab staffId={selectedId} staffName={selectedStaffSummary.name} />}
                {activeTab === 'absences' && <AbsencesTab staffId={selectedId} hourlyRate={selectedStaffSummary.baseSalary / 208} />}
                {activeTab === 'history' && <HistoryTab staffId={selectedId} staffName={selectedStaffSummary.name} />}
                {activeTab === 'transactions' && <TransactionsTab staffId={selectedId} />}
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 bg-white dark:bg-gray-950">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <LayoutDashboard size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Staff Workspace</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Select an employee from the sidebar to view their profile, manage payroll, track attendance, and record advances.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
