'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Loader2, Info, TrendingUp, Minus, CheckCircle2 } from 'lucide-react'
import {
  getLastSettlement,
  getUnsettledAdvances,
  getAttendanceRecords,
} from '@/actions/payroll'
import {
  calcPayrollBreakdown,
  type AttendanceDay,
} from '@/lib/payroll-engine'
import { PayrollSettlementModal } from '@/components/payroll-settlement-modal-v2'

type StaffProfile = {
  id: number
  name: string
  baseSalary: number
  safetyAllowance: number
  overtimeAllowance: number
  transportAllowance: number
  otherAllowance: number
  overtimeMultiplier: number
  monthlyHours: number
  joiningDate: Date | null
  idNumber: string | null
  nationality: string | null
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

function BreakdownRow({ label, value, sub, type = 'neutral' }: {
  label: string; value: string; sub?: string
  type?: 'positive' | 'negative' | 'neutral' | 'total'
}) {
  const cls =
    type === 'positive' ? 'text-emerald-600 dark:text-emerald-400' :
    type === 'negative' ? 'text-red-500 dark:text-red-400' :
    type === 'total' ? 'text-blue-700 dark:text-blue-300 text-base font-black' :
    'text-gray-900 dark:text-white'
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div>
        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm font-black tabular-nums ml-4 shrink-0 ${cls}`}>{value}</p>
    </div>
  )
}

export function PayrollTab({ staff }: { staff: StaffProfile }) {
  const router = useRouter()
  const today = new Date()
  const [loading, setLoading] = useState(true)
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo] = useState(today.toISOString().split('T')[0])
  const [advances, setAdvances] = useState<any[]>([])
  const [advancesTotal, setAdvancesTotal] = useState(0)
  const [deductionsTotal, setDeductionsTotal] = useState(0)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDay[]>([])
  const [lastSettlement, setLastSettlement] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getLastSettlement(staff.id),
      getUnsettledAdvances(staff.id),
    ]).then(([last, advData]) => {
      setLastSettlement(last)
      setAdvances(advData.advances)
      setAdvancesTotal(advData.advancesTotal)
      setDeductionsTotal(advData.deductionsTotal)
      let from: Date
      if (last?.settledUpToDate) {
        const next = new Date(last.settledUpToDate)
        next.setDate(next.getDate() + 1)
        from = next
      } else {
        from = new Date(today.getFullYear(), today.getMonth(), 1)
      }
      setPeriodFrom(from.toISOString().split('T')[0])
    }).catch(console.error).finally(() => setLoading(false))
  }, [staff.id])

  // Load attendance when period is known
  useEffect(() => {
    if (!periodFrom || !periodTo) return
    const from = new Date(periodFrom + 'T00:00:00')
    const to = new Date(periodTo + 'T23:59:59')
    getAttendanceRecords(staff.id, from, to).then(records => {
      setAttendanceRecords(records.map(r => ({
        date: new Date(r.date),
        clockIn: new Date(r.clockIn),
        clockOut: new Date(r.clockOut),
        workedHours: r.workedHours,
        isFriday: r.isFriday,
        isHoliday: r.isHoliday,
      })))
    }).catch(console.error)
  }, [periodFrom, periodTo, staff.id])

  const breakdown = useMemo(() => {
    if (!periodFrom || !periodTo) return null
    const from = new Date(periodFrom + 'T00:00:00')
    const to = new Date(periodTo + 'T23:59:59')
    return calcPayrollBreakdown({
      attendanceRecords,
      baseSalary: staff.baseSalary,
      safetyAllowance: staff.safetyAllowance,
      transportAllowance: staff.transportAllowance,
      otherAllowance: staff.otherAllowance,
      overtimeMultiplier: staff.overtimeMultiplier,
      bonus: 0,
      advancesTotal,
      otherDeductions: deductionsTotal,
      absenceDeduction: 0,
      settlementFrom: from,
      settlementTo: to,
      month: to.getMonth() + 1,
      year: to.getFullYear(),
    })
  }, [periodFrom, periodTo, attendanceRecords, staff, advancesTotal, deductionsTotal])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Last settlement banner */}
      {lastSettlement && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
              Last settled: {format(new Date(lastSettlement.paidAt), 'dd MMM yyyy')}
              {' '}&mdash; {lastSettlement.netPaid.toFixed(2)} SAR
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 font-medium">
              Period started from: {periodFrom}
            </p>
          </div>
        </div>
      )}

      {/* Attendance summary */}
      {breakdown && (
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Attendance — {attendanceRecords.length} days logged
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Official Hrs', value: breakdown.officialHours.toFixed(0), color: 'text-blue-600' },
              { label: 'OT Hrs', value: breakdown.overtimeHours.toFixed(1), color: 'text-orange-600' },
              { label: 'Friday Hrs', value: breakdown.fridayHours.toFixed(1), color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {attendanceRecords.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mt-3">
              <Info size={14} className="text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                No attendance records for this period. OT will be 0. Log attendance in the Attendance tab first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payroll breakdown */}
      {breakdown && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <TrendingUp size={12} className="text-emerald-500" /> Earnings
            </p>
          </div>
          <div className="p-4 space-y-0">
            <BreakdownRow
              label="Basic Salary"
              sub={breakdown.isFullMonth ? 'Full month' : `Pro-rated ${breakdown.settlementDays}/${breakdown.monthTotalDays} days`}
              value={`${breakdown.baseSalaryEarned.toFixed(2)} SAR`}
              type="positive"
            />
            {breakdown.safetyAllowance > 0 && <BreakdownRow label="Safety Allowance" value={`+ ${breakdown.safetyAllowance.toFixed(2)} SAR`} type="positive" />}
            {breakdown.transportAllowance > 0 && <BreakdownRow label="Transport Allowance" value={`+ ${breakdown.transportAllowance.toFixed(2)} SAR`} type="positive" />}
            {breakdown.otherAllowance > 0 && <BreakdownRow label="Other Allowance" value={`+ ${breakdown.otherAllowance.toFixed(2)} SAR`} type="positive" />}
            {breakdown.overtimeHours > 0 && <BreakdownRow label="Overtime" sub={`${breakdown.overtimeHours.toFixed(1)} hrs × ${breakdown.overtimeHourRate.toFixed(2)}`} value={`+ ${breakdown.overtimeAmount.toFixed(2)} SAR`} type="positive" />}
            {breakdown.fridayHours > 0 && <BreakdownRow label="Friday OT" sub={`${breakdown.fridayHours.toFixed(1)} hrs × ${breakdown.overtimeHourRate.toFixed(2)}`} value={`+ ${breakdown.fridayOvertimeAmount.toFixed(2)} SAR`} type="positive" />}
            <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-800 mt-2">
              <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">Total Earnings</span>
              <span className="text-sm font-black text-emerald-600 tabular-nums">{breakdown.totalEarnings.toFixed(2)} SAR</span>
            </div>
          </div>

          {(breakdown.advancesTotal > 0 || breakdown.otherDeductions > 0) && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-3">
                <Minus size={12} className="text-red-500" /> Deductions
              </p>
              {breakdown.advancesTotal > 0 && <BreakdownRow label={`Advances (${advances.length} txn)`} value={`− ${breakdown.advancesTotal.toFixed(2)} SAR`} type="negative" />}
              {breakdown.otherDeductions > 0 && <BreakdownRow label="Other Deductions" value={`− ${breakdown.otherDeductions.toFixed(2)} SAR`} type="negative" />}
            </div>
          )}

          <div className={`p-4 border-t border-gray-100 dark:border-gray-800 ${breakdown.netSalary >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Net Salary</span>
              <span className={`text-3xl font-black tabular-nums ${breakdown.netSalary >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {breakdown.netSalary.toFixed(2)} <span className="text-sm text-gray-400">SAR</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settle button */}
      <PayrollSettlementModal
        staff={{
          id: staff.id,
          name: staff.name,
          baseSalary: staff.baseSalary,
          safetyAllowance: staff.safetyAllowance,
          transportAllowance: staff.transportAllowance,
          otherAllowance: staff.otherAllowance,
          overtimeMultiplier: staff.overtimeMultiplier,
          joiningDate: staff.joiningDate,
        }}
        onSettled={() => router.refresh()}
      />
    </div>
  )
}
