'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  DollarSign, TrendingDown, Clock, AlertTriangle, CheckCircle2,
  Loader2, Plus, Calendar
} from 'lucide-react'
import { getOverviewData } from '@/actions/staff-tabs'
import { AddTransactionModal } from '@/components/add-transaction-modal'
import { AbsenceRecordModal } from '@/components/absence-record-modal'

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

type OverviewData = {
  advancesTotal: number
  deductionsTotal: number
  totalUnsettled: number
  absenceHours: number
  attendanceDays: number
  officialHoursThisMonth: number
  overtimeHoursThisMonth: number
  fridayHoursThisMonth: number
  lastSettlement: {
    paidAt: Date
    netPaid: number
    month: number
    year: number
    settledUpToDate: Date | null
  } | null
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-1 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 font-medium">{sub}</p>}
    </div>
  )
}

export function OverviewTab({ staff }: { staff: StaffProfile }) {
  const router = useRouter()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [advanceOpen, setAdvanceOpen] = useState(false)

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const hourlyRate = staff.baseSalary / (staff.monthlyHours || 208)

  const fetchData = () => {
    setLoading(true)
    getOverviewData(staff.id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [staff.id])

  const totalMonthlySalary =
    staff.baseSalary + staff.safetyAllowance + staff.overtimeAllowance +
    staff.transportAllowance + staff.otherAllowance

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top 2-col: Identity + Salary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identity card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Employee Profile</p>
          <div className="space-y-3">
            {[
              { label: 'Full Name', value: staff.name },
              { label: 'ID / Iqama', value: staff.idNumber || '—' },
              { label: 'Nationality', value: staff.nationality || '—' },
              { label: 'Joining Date', value: staff.joiningDate ? format(new Date(staff.joiningDate), 'dd MMM yyyy') : '—' },
              { label: 'OT Multiplier', value: `${staff.overtimeMultiplier}×` },
              { label: 'Monthly Hours', value: `${staff.monthlyHours} hrs` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Salary structure card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Salary Structure</p>
          <div className="space-y-2">
            {[
              { label: 'Base Salary', value: staff.baseSalary, color: 'text-gray-900 dark:text-white' },
              { label: 'Safety Allowance', value: staff.safetyAllowance, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'OT Allowance (Legacy)', value: staff.overtimeAllowance, color: 'text-orange-600 dark:text-orange-400' },
              { label: 'Transport Allowance', value: staff.transportAllowance, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Other Allowance', value: staff.otherAllowance, color: 'text-purple-600 dark:text-purple-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-1">
                <span className="text-xs font-bold text-gray-400">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${color}`}>
                  {value > 0 ? `${value.toFixed(0)} SAR` : '—'}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="text-sm font-black uppercase tracking-wide text-gray-700 dark:text-gray-300">Total Monthly</span>
              <span className="text-xl font-black tabular-nums text-emerald-600">
                {totalMonthlySalary.toFixed(0)} <span className="text-xs text-gray-400">SAR</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">
              Hourly rate: {hourlyRate.toFixed(2)} SAR/hr · OT rate: {(hourlyRate * staff.overtimeMultiplier).toFixed(2)} SAR/hr
            </p>
          </div>
        </div>
      </div>

      {/* This month stats */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
          This Month — {format(now, 'MMMM yyyy')}
        </p>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-2">
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-2/3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Pending Advances" value={`${data.advancesTotal.toFixed(0)} SAR`} sub={`Deducted next payroll`} color="" />
            <StatCard label="Absence Deduction" value={`${(data.absenceHours * hourlyRate).toFixed(0)} SAR`} sub={`${data.absenceHours.toFixed(1)} hrs absent`} color="" />
            <StatCard label="Overtime Hours" value={`${data.overtimeHoursThisMonth.toFixed(1)} hrs`} sub={`${data.fridayHoursThisMonth.toFixed(1)} Friday hrs`} color="" />
            <StatCard
              label="Last Settlement"
              value={data.lastSettlement ? `${data.lastSettlement.netPaid.toFixed(0)} SAR` : '—'}
              sub={data.lastSettlement ? format(new Date(data.lastSettlement.paidAt), 'dd MMM yyyy') : 'No settlements yet'}
              color=""
            />
          </div>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setAdvanceOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus size={15} />
          Record Advance
        </button>

        <AbsenceRecordModal
          staffId={staff.id}
          staffName={staff.name}
          hourlyRate={hourlyRate}
          month={month}
          year={year}
          existingRecords={[]}
          onRefresh={fetchData}
        />
      </div>

      {/* Hidden advance modal */}
      <AddTransactionModal
        open={advanceOpen}
        onOpenChange={(v) => {
          setAdvanceOpen(v)
          if (!v) { fetchData(); router.refresh() }
        }}
        hideTrigger
      />
    </div>
  )
}
