'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Users, TrendingDown } from 'lucide-react'
import { AddStaffModal } from '@/components/add-staff-modal'
import { useSession } from 'next-auth/react'

type SidebarStaff = {
  id: number
  name: string
  baseSalary: number
  safetyAllowance: number
  overtimeAllowance: number
  transportAllowance: number
  otherAllowance: number
  totalUnsettled: number
  totalMonthlySalary: number
}

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function StaffSidebar({
  staffList,
  userRole,
}: {
  staffList: SidebarStaff[]
  userRole?: string
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [search, setSearch] = useState('')

  const activeId = (() => {
    const match = pathname.match(/\/staff\/(\d+)/)
    return match ? parseInt(match[1]) : null
  })()

  const filtered = staffList.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const role = userRole || session?.user?.role

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">HR &amp; Payroll</p>
            <p className="text-sm font-bold text-white">{staffList.length} Employees</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-white/5 border border-white/10 rounded-xl text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-xs font-medium">
            No employees found
          </div>
        ) : (
          filtered.map(staff => {
            const isActive = staff.id === activeId
            const avatarColor = getAvatarColor(staff.name)
            const initials = getInitials(staff.name)

            return (
              <Link
                key={staff.id}
                href={`/staff/${staff.id}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-blue-600 shadow-lg shadow-blue-600/20'
                    : 'hover:bg-white/5'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ${
                    isActive ? 'bg-white/20' : avatarColor
                  }`}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
                    {staff.name}
                  </p>
                  <p className={`text-[10px] font-medium ${isActive ? 'text-blue-200' : 'text-gray-500'}`}>
                    {staff.totalMonthlySalary.toFixed(0)} SAR/mo
                  </p>
                </div>

                {/* Advances badge */}
                {staff.totalUnsettled > 0 && (
                  <div className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    <TrendingDown size={9} />
                    {staff.totalUnsettled.toFixed(0)}
                  </div>
                )}
              </Link>
            )
          })
        )}
      </div>

      {/* Add staff button */}
      {(role === 'SUPER_ADMIN' || role === 'ADMIN') && (
        <div className="p-3 border-t border-white/5">
          <AddStaffModal onAdded={() => window.location.reload()} />
        </div>
      )}
    </div>
  )
}
