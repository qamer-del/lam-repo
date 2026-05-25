'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AddStaffModal } from '@/components/add-staff-modal'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

type StaffSummary = {
  id: number
  name: string
  baseSalary: number
  totalMonthlySalary: number
  unsettledAdvancesTotal: number
  isActive: boolean
}

interface StaffSidebarProps {
  staffList: StaffSummary[]
  selectedId: number | null
  onSelect: (id: number) => void
  onStaffAdded?: () => void
}

function BalanceIndicator({ advances, salary }: { advances: number; salary: number }) {
  if (advances === 0) {
    return (
      <span className="text-[9px] font-black text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
        CLEAR
      </span>
    )
  }
  const pct = advances / salary
  if (pct < 0.5) {
    return (
      <span className="text-[9px] font-black text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full tabular-nums">
        −{advances.toFixed(0)}
      </span>
    )
  }
  return (
    <span className="text-[9px] font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full tabular-nums">
      −{advances.toFixed(0)}
    </span>
  )
}

export function StaffSidebar({ staffList, selectedId, onSelect, onStaffAdded }: StaffSidebarProps) {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const isAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ADMIN'

  const filtered = useMemo(
    () => staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
    [staffList, search]
  )

  // Aggregate stats
  const totalPayroll = staffList.reduce((s, e) => s + e.totalMonthlySalary, 0)
  const totalAdvances = staffList.reduce((s, e) => s + e.unsettledAdvancesTotal, 0)

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800">
      {/* Top header */}
      <div className="px-4 pt-5 pb-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Staff</h1>
          {isAdmin && (
            <AddStaffModal onAdded={onStaffAdded} />
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl px-3 py-2">
            <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Monthly</p>
            <p className="text-sm font-black text-blue-700 dark:text-blue-400 tabular-nums">{totalPayroll.toFixed(0)}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
            <p className="text-[9px] font-black uppercase text-amber-400 tracking-wider">Advances</p>
            <p className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">{totalAdvances.toFixed(0)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      {/* Staff list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">No employees found</div>
        ) : (
          filtered.map(staff => {
            const isSelected = selectedId === staff.id
            const initials = staff.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

            return (
              <button
                key={staff.id}
                onClick={() => onSelect(staff.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/60 text-gray-700 dark:text-gray-300'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-all',
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                )}>
                  {initials}
                </div>

                {/* Name + balance */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold truncate', isSelected ? 'text-white' : '')}>{staff.name}</p>
                  <p className={cn('text-[10px] tabular-nums', isSelected ? 'text-blue-200' : 'text-gray-400')}>
                    {staff.totalMonthlySalary.toFixed(0)} SAR/mo
                  </p>
                </div>

                {/* Balance indicator */}
                {!isSelected && <BalanceIndicator advances={staff.unsettledAdvancesTotal} salary={staff.totalMonthlySalary} />}
              </button>
            )
          })
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <p className="text-[10px] text-gray-400 font-medium">{staffList.length} employees</p>
      </div>
    </aside>
  )
}
