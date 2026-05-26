'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Edit2, Calendar, Flag, CreditCard, CheckCircle, XCircle } from 'lucide-react'
import { EditStaffModal } from '@/components/edit-staff-modal'

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

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
]

function getAvatarGradient(name: string): string {
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

export function StaffProfileHeader({ staff }: { staff: StaffProfile }) {
  const router = useRouter()
  const totalMonthlySalary =
    staff.baseSalary +
    staff.safetyAllowance +
    staff.overtimeAllowance +
    staff.transportAllowance +
    staff.otherAllowance

  const gradient = getAvatarGradient(staff.name)
  const initials = getInitials(staff.name)

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-lg md:text-xl shrink-0 shadow-lg`}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white truncate">
                {staff.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Status */}
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  staff.isActive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {staff.isActive ? <CheckCircle size={9} /> : <XCircle size={9} />}
                  {staff.isActive ? 'Active' : 'Inactive'}
                </span>

                {/* ID Number */}
                {staff.idNumber && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <CreditCard size={9} />
                    {staff.idNumber}
                  </span>
                )}

                {/* Nationality */}
                {staff.nationality && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <Flag size={9} />
                    {staff.nationality}
                  </span>
                )}

                {/* Joining date */}
                {staff.joiningDate && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <Calendar size={9} />
                    Joined {format(new Date(staff.joiningDate), 'MMM yyyy')}
                  </span>
                )}
              </div>
            </div>

            {/* Right: salary + edit */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Monthly</p>
                <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                  {totalMonthlySalary.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  <span className="text-xs font-bold text-gray-400 ml-1">SAR</span>
                </p>
              </div>

              <EditStaffModal
                staff={{
                  id: staff.id,
                  name: staff.name,
                  baseSalary: staff.baseSalary,
                  safetyAllowance: staff.safetyAllowance,
                  overtimeAllowance: staff.overtimeAllowance,
                  transportAllowance: staff.transportAllowance,
                  otherAllowance: staff.otherAllowance,
                  overtimeMultiplier: staff.overtimeMultiplier,
                  monthlyHours: staff.monthlyHours,
                  idNumber: staff.idNumber || undefined,
                  nationality: staff.nationality || undefined,
                  userId: staff.userId,
                }}
                onUpdated={() => router.refresh()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
