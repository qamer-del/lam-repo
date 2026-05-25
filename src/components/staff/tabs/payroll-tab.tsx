'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, TrendingUp, Minus, Info, Wallet, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getAttendanceRecords, getUnsettledAdvances, getLastSettlement } from '@/actions/payroll'
import { calcPayrollBreakdown, getDaysInMonth, type AttendanceDay } from '@/lib/payroll-engine'
import { ErpSettleDialog } from '@/components/staff/dialogs/erp-settle-dialog'
import { format, startOfMonth } from 'date-fns'

interface StaffData {
  id: number
  name: string
  baseSalary: number
  safetyAllowance?: number
  transportAllowance?: number
  otherAllowance?: number
  overtimeMultiplier?: number
  joiningDate?: Date | null
}

interface PayrollTabProps {
  staff: StaffData
  onSettled?: () => void
}

export function PayrollTab({ staff, onSettled }: PayrollTabProps) {
  const [loading, setLoading] = useState(true)
  const [settleOpen, setSettleOpen] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDay[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [advancesTotal, setAdvancesTotal] = useState(0)
  const [deductionsTotal, setDeductionsTotal] = useState(0)
  const [bonus, setBonus] = useState('')
  const [periodFrom, setPeriodFrom] = useState<string>('')
  const [periodTo, setPeriodTo] = useState<string>('')

  const today = new Date()
  const defaultTo = today.toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lastSettlement, advData] = await Promise.all([
        getLastSettlement(staff.id),
        getUnsettledAdvances(staff.id),
      ])

      let from: Date
      if (lastSettlement?.settledUpToDate) {
        const next = new Date(lastSettlement.settledUpToDate)
        next.setDate(next.getDate() + 1)
        from = next
      } else {
        from = startOfMonth(today)
      }
      const fromStr = from.toISOString().split('T')[0]
      setPeriodFrom(fromStr)
      setPeriodTo(defaultTo)
      setAdvances(advData.advances)
      setAdvancesTotal(advData.advancesTotal)
      setDeductionsTotal(advData.deductionsTotal)

      // Load attendance for the computed period
      const to = new Date(defaultTo + 'T23:59:59')
      const records = await getAttendanceRecords(staff.id, from, to)
      setAttendanceRecords(records.map(r => ({
        date: new Date(r.date),
        clockIn: new Date(r.clockIn),
        clockOut: new Date(r.clockOut),
        workedHours: r.workedHours,
        isFriday: r.isFriday,
        isHoliday: r.isHoliday,
      })))
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [staff.id])

  useEffect(() => { load() }, [load])

  // Reload attendance when period changes
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
    const month = to.getMonth() + 1
    const year = to.getFullYear()
    return calcPayrollBreakdown({
      attendanceRecords,
      baseSalary: staff.baseSalary,
      safetyAllowance: staff.safetyAllowance || 0,
      transportAllowance: staff.transportAllowance || 0,
      otherAllowance: staff.otherAllowance || 0,
      overtimeMultiplier: staff.overtimeMultiplier || 1.5,
      bonus: parseFloat(bonus) || 0,
      advancesTotal,
      otherDeductions: deductionsTotal,
      absenceDeduction: 0,
      settlementFrom: from,
      settlementTo: to,
      month,
      year,
    })
  }, [periodFrom, periodTo, attendanceRecords, staff, bonus, advancesTotal, deductionsTotal])

  const netPayable = breakdown?.netSalary ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Settlement Period</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">From</Label>
            <Input type="date" value={periodFrom} max={periodTo}
              onChange={e => setPeriodFrom(e.target.value)}
              className="h-10 rounded-xl bg-white dark:bg-black/20 border-blue-100 dark:border-blue-900/40 text-sm font-bold" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">To</Label>
            <Input type="date" value={periodTo} max={defaultTo}
              onChange={e => setPeriodTo(e.target.value)}
              className="h-10 rounded-xl bg-white dark:bg-black/20 border-blue-100 dark:border-blue-900/40 text-sm font-bold" />
          </div>
        </div>
        {breakdown && (
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            {breakdown.settlementDays} days — {breakdown.isFullMonth ? '✓ Full Month' : 'Partial Month (Pro-rated)'}
          </p>
        )}
      </div>

      {/* Hours summary */}
      {breakdown && (
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Attendance Summary ({attendanceRecords.length} days logged)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Official Hrs', value: breakdown.officialHours.toFixed(0), color: 'text-blue-600' },
              { label: 'Overtime Hrs', value: breakdown.overtimeHours.toFixed(1), color: 'text-orange-600' },
              { label: 'Friday Hrs', value: breakdown.fridayHours.toFixed(1), color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
                <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {attendanceRecords.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <Info size={13} className="text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                No attendance records found for this period. Overtime will be 0. Log attendance in the Attendance tab first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Breakdown */}
      {breakdown && (
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Earnings */}
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <TrendingUp size={12} className="text-emerald-500" /> Earnings
            </p>
            {[
              { label: 'Basic Salary', sub: breakdown.isFullMonth ? 'Full month' : `${breakdown.settlementDays}/${breakdown.monthTotalDays} days`, value: breakdown.baseSalaryEarned },
              ...(breakdown.safetyAllowance > 0 ? [{ label: 'Safety Allowance', value: breakdown.safetyAllowance }] : []),
              ...(breakdown.overtimeHours > 0 ? [{ label: 'Overtime Pay', sub: `${breakdown.overtimeHours.toFixed(1)}h × ${breakdown.overtimeHourRate.toFixed(2)} SAR`, value: breakdown.overtimeAmount }] : []),
              ...(breakdown.fridayHours > 0 ? [{ label: 'Friday OT', sub: `${breakdown.fridayHours.toFixed(1)}h × ${breakdown.overtimeHourRate.toFixed(2)} SAR`, value: breakdown.fridayOvertimeAmount }] : []),
              ...(breakdown.transportAllowance > 0 ? [{ label: 'Transport', value: breakdown.transportAllowance }] : []),
              ...(breakdown.otherAllowance > 0 ? [{ label: 'Other', value: breakdown.otherAllowance }] : []),
            ].map(({ label, sub, value }: any) => (
              <div key={label} className="flex items-start justify-between py-1">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                  {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                </div>
                <p className="text-sm font-black tabular-nums text-emerald-600 ml-4">+{value.toFixed(2)}</p>
              </div>
            ))}
            {/* Bonus */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Bonus</p>
                <p className="text-[10px] text-gray-400">One-time</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600">+</span>
                <Input type="number" min="0" step="0.01" value={bonus}
                  onChange={e => setBonus(e.target.value)} placeholder="0.00"
                  className="w-24 h-7 text-right text-xs font-bold rounded-lg border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-black uppercase text-gray-600 dark:text-gray-400">Total Earnings</span>
              <span className="text-sm font-black text-emerald-600 tabular-nums">{breakdown.totalEarnings.toFixed(2)} SAR</span>
            </div>
          </div>

          {/* Deductions */}
          {(breakdown.advancesTotal > 0 || breakdown.otherDeductions > 0) && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Minus size={12} className="text-red-500" /> Deductions
              </p>
              {breakdown.advancesTotal > 0 && (
                <div className="flex items-start justify-between py-1">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Advances ({advances.length})</p>
                    <p className="text-[10px] text-gray-400">Unsettled</p>
                  </div>
                  <p className="text-sm font-black tabular-nums text-red-500 ml-4">−{breakdown.advancesTotal.toFixed(2)}</p>
                </div>
              )}
              {breakdown.otherDeductions > 0 && (
                <div className="flex justify-between py-1">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Other Deductions</p>
                  <p className="text-sm font-black tabular-nums text-red-500">−{breakdown.otherDeductions.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {/* Net */}
          <div className={`p-4 border-t border-gray-100 dark:border-gray-800 ${netPayable >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Net Salary</span>
              <span className={`text-3xl font-black tabular-nums ${netPayable >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {netPayable.toFixed(2)} <span className="text-sm">SAR</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settle button */}
      <Button onClick={() => setSettleOpen(true)}
        className="w-full py-6 text-base bg-emerald-600 hover:bg-emerald-700 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 gap-3 transition-all active:scale-[0.98]">
        <Wallet size={20} />
        Settle Salary
      </Button>

      <ErpSettleDialog
        staff={staff}
        open={settleOpen}
        onOpenChange={setSettleOpen}
        onSettled={() => { load(); onSettled?.() }}
      />
    </div>
  )
}
