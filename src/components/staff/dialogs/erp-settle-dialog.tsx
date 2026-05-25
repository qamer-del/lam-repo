'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Wallet, CheckCircle2, Download, AlertTriangle, Calendar, Loader2,
  TrendingUp, Minus, CreditCard, Landmark, Banknote, Info, Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { settleSalaryV2, getUnsettledAdvances, getLastSettlement, getAttendanceRecords } from '@/actions/payroll'
import { getStaffOverdueCredits } from '@/actions/staff'
import {
  calcPayrollBreakdown,
  getDaysInMonth,
  type AttendanceDay,
} from '@/lib/payroll-engine'
import { format } from 'date-fns'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { SalarySettlementDocument } from '@/components/salary-settlement-pdf'

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

interface ErpSettleDialogProps {
  staff: StaffData
  open: boolean
  onOpenChange: (v: boolean) => void
  onSettled?: () => void
}

function BreakdownRow({
  label, value, type = 'neutral', sub,
}: {
  label: string; value: string; type?: 'positive' | 'negative' | 'neutral' | 'total'; sub?: string
}) {
  const color =
    type === 'positive' ? 'text-emerald-600 dark:text-emerald-400' :
    type === 'negative' ? 'text-red-500 dark:text-red-400' :
    type === 'total' ? 'text-blue-700 dark:text-blue-300 text-base font-black' :
    'text-gray-900 dark:text-white'
  return (
    <div className="flex items-start justify-between py-2">
      <div>
        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm font-black tabular-nums shrink-0 ml-4 ${color}`}>{value}</p>
    </div>
  )
}

export function ErpSettleDialog({ staff, open, onOpenChange, onSettled }: ErpSettleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [settledData, setSettledData] = useState<any>(null)
  const [method, setMethod] = useState<'CASH' | 'NETWORK' | 'SPLIT'>('CASH')
  const [cashSource, setCashSource] = useState<'CASH_DRAWER' | 'SALARY_FUND'>('SALARY_FUND')
  const [cashAmount, setCashAmount] = useState('')
  const [networkAmount, setNetworkAmount] = useState('')
  const [bonus, setBonus] = useState('')
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDay[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [advancesTotal, setAdvancesTotal] = useState(0)
  const [deductionsTotal, setDeductionsTotal] = useState(0)
  const [overdueInfo, setOverdueInfo] = useState<{ count: number; total: number } | null>(null)
  const [deductOverdue, setDeductOverdue] = useState(false)

  const today = new Date()
  const [periodFrom, setPeriodFrom] = useState<string>('')
  const [periodTo, setPeriodTo] = useState<string>(today.toISOString().split('T')[0])

  useEffect(() => {
    if (!open) { setSettledData(null); setDeductOverdue(false); return }
    setDataLoading(true)
    Promise.all([
      getLastSettlement(staff.id),
      getUnsettledAdvances(staff.id),
      getStaffOverdueCredits(staff.id),
    ]).then(([lastSettlement, advData, overdueData]) => {
      let from: Date
      if (lastSettlement?.settledUpToDate) {
        const next = new Date(lastSettlement.settledUpToDate)
        next.setDate(next.getDate() + 1)
        from = next
      } else {
        from = new Date(today.getFullYear(), today.getMonth(), 1)
      }
      setPeriodFrom(from.toISOString().split('T')[0])
      setAdvances(advData.advances)
      setAdvancesTotal(advData.advancesTotal)
      setDeductionsTotal(advData.deductionsTotal)
      setOverdueInfo({ count: overdueData.count, total: overdueData.total })
    }).catch(console.error).finally(() => setDataLoading(false))
  }, [open, staff.id])

  useEffect(() => {
    if (!periodFrom || !periodTo || !open) return
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
  }, [periodFrom, periodTo, open, staff.id])

  const breakdown = useMemo(() => {
    if (!periodFrom || !periodTo) return null
    const from = new Date(periodFrom + 'T00:00:00')
    const to = new Date(periodTo + 'T23:59:59')
    const month = to.getMonth() + 1
    const year = to.getFullYear()
    const overdueDeduction = deductOverdue && overdueInfo ? overdueInfo.total : 0
    return calcPayrollBreakdown({
      attendanceRecords,
      baseSalary: staff.baseSalary,
      safetyAllowance: staff.safetyAllowance || 0,
      transportAllowance: staff.transportAllowance || 0,
      otherAllowance: staff.otherAllowance || 0,
      overtimeMultiplier: staff.overtimeMultiplier || 1.5,
      bonus: parseFloat(bonus) || 0,
      advancesTotal: advancesTotal + overdueDeduction,
      otherDeductions: deductionsTotal,
      absenceDeduction: 0,
      settlementFrom: from,
      settlementTo: to,
      month,
      year,
    })
  }, [periodFrom, periodTo, attendanceRecords, staff, bonus, advancesTotal, deductionsTotal, deductOverdue, overdueInfo])

  const netPayable = breakdown?.netSalary ?? 0

  useEffect(() => {
    if (method === 'SPLIT' && netPayable > 0) {
      const half = (netPayable / 2).toFixed(2)
      setCashAmount(half)
      setNetworkAmount((netPayable - parseFloat(half)).toFixed(2))
    } else {
      setCashAmount(''); setNetworkAmount('')
    }
  }, [method, netPayable])

  const splitValid = method !== 'SPLIT' || (() => {
    const c = parseFloat(cashAmount) || 0
    const n = parseFloat(networkAmount) || 0
    return Math.abs((c + n) - netPayable) < 0.01 && c >= 0 && n >= 0
  })()

  const handleSettle = async () => {
    if (!breakdown || !periodFrom || !periodTo) return
    setLoading(true)
    try {
      const from = new Date(periodFrom + 'T00:00:00')
      const to = new Date(periodTo + 'T23:59:59')
      const month = to.getMonth() + 1
      const year = to.getFullYear()
      const res = await settleSalaryV2({
        staffId: staff.id,
        month, year,
        settlementFrom: from,
        settledUpToDate: to,
        baseSalaryEarned: breakdown.baseSalaryEarned,
        workedDays: breakdown.settlementDays,
        totalDays: breakdown.monthTotalDays,
        officialHours: breakdown.officialHours,
        overtimeHours: breakdown.overtimeHours,
        fridayHours: breakdown.fridayHours,
        overtimeAmount: breakdown.overtimeAmount,
        fridayOvertimeAmount: breakdown.fridayOvertimeAmount,
        overtimeMultiplier: breakdown.overtimeMultiplier,
        safetyAllowance: breakdown.safetyAllowance,
        transportAllowance: breakdown.transportAllowance,
        otherAllowance: breakdown.otherAllowance,
        bonus: parseFloat(bonus) || 0,
        advancesTotal: breakdown.advancesTotal,
        otherDeductions: breakdown.otherDeductions,
        absenceDeduction: 0,
        netPaid: netPayable,
        method,
        cashSource: method === 'CASH' ? cashSource : undefined,
        cashAmount: method === 'SPLIT' ? parseFloat(cashAmount) : undefined,
        networkAmount: method === 'SPLIT' ? parseFloat(networkAmount) : undefined,
      })
      setSettledData(res)
      toast.success('Settlement Complete ✓', {
        description: `${staff.name} — ${netPayable.toFixed(2)} SAR paid successfully.`,
      })
      onSettled?.()
    } catch (err: any) {
      toast.error('Settlement Failed', { description: err.message || 'An error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setSettledData(null) }}>
      <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto rounded-3xl p-0 border-none bg-white dark:bg-gray-950 shadow-2xl">
        {!settledData ? (
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Wallet size={20} />
                </div>
                Payroll Settlement
              </DialogTitle>
              <p className="text-sm text-gray-500 font-medium">{staff.name}</p>
            </DialogHeader>

            {dataLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <>
                {/* Period */}
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
                      <Input type="date" value={periodTo} max={today.toISOString().split('T')[0]}
                        onChange={e => setPeriodTo(e.target.value)}
                        className="h-10 rounded-xl bg-white dark:bg-black/20 border-blue-100 dark:border-blue-900/40 text-sm font-bold" />
                    </div>
                  </div>
                  {breakdown && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      {breakdown.settlementDays} days • {breakdown.isFullMonth ? '✓ Full Month' : 'Partial Month — Pro-rated'}
                    </p>
                  )}
                </div>

                {/* Attendance Summary */}
                {breakdown && (
                  <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Attendance ({attendanceRecords.length} days logged)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Official Hrs', value: breakdown.officialHours.toFixed(0), color: 'text-blue-600' },
                        { label: 'OT Hrs', value: breakdown.overtimeHours.toFixed(1), color: 'text-orange-600' },
                        { label: 'Friday Hrs', value: breakdown.fridayHours.toFixed(1), color: 'text-amber-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                          <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{label}</p>
                        </div>
                      ))}
                    </div>
                    {attendanceRecords.length === 0 && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <Info size={14} className="text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          No attendance records found. OT will be 0. Log attendance for accurate calculation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Earnings + Deductions Breakdown */}
                {breakdown && (
                  <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="p-4 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                        <TrendingUp size={12} className="text-emerald-500" /> Earnings
                      </p>
                      <BreakdownRow label="Basic Salary"
                        sub={breakdown.isFullMonth ? 'Full month' : `Pro-rated ${breakdown.settlementDays}/${breakdown.monthTotalDays} days`}
                        value={`${breakdown.baseSalaryEarned.toFixed(2)} SAR`} type="positive" />
                      {breakdown.safetyAllowance > 0 && <BreakdownRow label="Safety Allowance" value={`+ ${breakdown.safetyAllowance.toFixed(2)} SAR`} type="positive" />}
                      {breakdown.overtimeHours > 0 && <BreakdownRow label="Overtime"
                        sub={`${breakdown.overtimeHours.toFixed(1)} hrs × ${breakdown.overtimeHourRate.toFixed(2)} SAR/hr`}
                        value={`+ ${breakdown.overtimeAmount.toFixed(2)} SAR`} type="positive" />}
                      {breakdown.fridayHours > 0 && <BreakdownRow label="Friday Overtime"
                        sub={`${breakdown.fridayHours.toFixed(1)} hrs × ${breakdown.overtimeHourRate.toFixed(2)} SAR/hr`}
                        value={`+ ${breakdown.fridayOvertimeAmount.toFixed(2)} SAR`} type="positive" />}
                      {breakdown.transportAllowance > 0 && <BreakdownRow label="Transport Allowance" value={`+ ${breakdown.transportAllowance.toFixed(2)} SAR`} type="positive" />}
                      {breakdown.otherAllowance > 0 && <BreakdownRow label="Other Allowance" value={`+ ${breakdown.otherAllowance.toFixed(2)} SAR`} type="positive" />}
                      {/* Bonus input */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Bonus</p>
                          <p className="text-[10px] text-gray-400">One-time bonus for this period</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600">+</span>
                          <Input type="number" min="0" step="0.01" value={bonus}
                            onChange={e => setBonus(e.target.value)} placeholder="0.00"
                            className="w-28 h-8 text-right font-bold rounded-lg border-emerald-200 focus-visible:ring-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-300">Total Earnings</span>
                        <span className="text-sm font-black text-emerald-600 tabular-nums">{breakdown.totalEarnings.toFixed(2)} SAR</span>
                      </div>
                    </div>

                    {(breakdown.advancesTotal > 0 || breakdown.otherDeductions > 0) && (
                      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                          <Minus size={12} className="text-red-500" /> Deductions
                        </p>
                        {advances.length > 0 && (
                          <BreakdownRow label={`Advances (${advances.length})`}
                            value={`− ${advancesTotal.toFixed(2)} SAR`} type="negative" />
                        )}
                        {breakdown.otherDeductions > 0 && (
                          <BreakdownRow label="Other Deductions" value={`− ${breakdown.otherDeductions.toFixed(2)} SAR`} type="negative" />
                        )}
                        {deductOverdue && overdueInfo && overdueInfo.total > 0 && (
                          <BreakdownRow label="Overdue Credit Deduction" value={`− ${overdueInfo.total.toFixed(2)} SAR`} type="negative" />
                        )}
                      </div>
                    )}

                    <div className={`p-4 ${netPayable >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'} border-t border-gray-100 dark:border-gray-800`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Net Salary</span>
                        <span className={`text-2xl font-black tabular-nums ${netPayable >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {netPayable.toFixed(2)} SAR
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overdue Credit */}
                {overdueInfo && overdueInfo.count > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-700 dark:text-red-400">
                          {overdueInfo.count} unpaid credit invoice(s) — {overdueInfo.total.toFixed(2)} SAR
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <input type="checkbox" id="deductOverdue" checked={deductOverdue}
                            onChange={e => setDeductOverdue(e.target.checked)}
                            className="w-4 h-4 rounded text-red-600 border-red-300" />
                          <label htmlFor="deductOverdue" className="text-[11px] text-red-700 dark:text-red-400 cursor-pointer">
                            Deduct from this settlement
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                    This will mark all advances as <strong>settled</strong> and lock this period. Cannot be undone.
                  </p>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'NETWORK', 'SPLIT'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setMethod(m)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          method === m
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300'
                        }`}>
                        <div className="flex justify-center mb-1">
                          {m === 'CASH' ? <Banknote size={16} /> : m === 'NETWORK' ? <CreditCard size={16} /> : <Landmark size={16} />}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wide">{m === 'SPLIT' ? 'Mixed' : m}</p>
                      </button>
                    ))}
                  </div>

                  {method === 'CASH' && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in-50 duration-200">
                      {([
                        { val: 'SALARY_FUND' as const, label: 'Salary Fund', sub: 'From monthly payroll pool' },
                        { val: 'CASH_DRAWER' as const, label: 'Cash Drawer', sub: 'From active cash drawer' },
                      ]).map(({ val, label, sub }) => (
                        <button key={val} type="button" onClick={() => setCashSource(val)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            cashSource === val
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                          }`}>
                          <p className="text-xs font-black text-gray-900 dark:text-white">{label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {method === 'SPLIT' && (
                    <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl animate-in fade-in-50 duration-200">
                      {[
                        { label: 'Cash (SAR)', val: cashAmount, set: setCashAmount, other: setNetworkAmount },
                        { label: 'Network (SAR)', val: networkAmount, set: setNetworkAmount, other: setCashAmount },
                      ].map(({ label, val, set, other }) => (
                        <div key={label} className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-gray-400">{label}</Label>
                          <Input type="number" min="0" step="0.01" value={val}
                            onChange={e => { set(e.target.value); other((netPayable - (parseFloat(e.target.value) || 0)).toFixed(2)) }}
                            className="h-10 rounded-xl font-bold bg-white dark:bg-black/20" placeholder="0.00" />
                        </div>
                      ))}
                      <div className="col-span-2 text-center">
                        {splitValid
                          ? <p className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Allocation matches</p>
                          : <p className="text-[10px] text-rose-500 font-semibold">Sum must equal {netPayable.toFixed(2)} SAR</p>
                        }
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleSettle} disabled={loading || !breakdown || !splitValid}
                  className="w-full py-6 text-base bg-emerald-600 hover:bg-emerald-700 font-bold rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                  Confirm & Process Payment
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Settlement Complete!</h3>
              <p className="text-sm text-gray-500 mt-2">{staff.name} — {(settledData.netPaid || 0).toFixed(2)} SAR paid</p>
              <p className="text-xs text-gray-400 mt-1">Period: {periodFrom} → {periodTo}</p>
            </div>
            <div className="flex flex-col gap-3">
              <PDFDownloadLink
                document={
                  <SalarySettlementDocument
                    locale="en"
                    staffName={staff.name}
                    month={settledData.month}
                    year={settledData.year}
                    baseSalary={settledData.baseSalary}
                    earnedSalary={settledData.earnedSalary}
                    workedDays={settledData.workedDays}
                    totalDays={settledData.totalDays}
                    advances={advances}
                    totalAdvances={settledData.advancesTally}
                    netPaid={settledData.netPaid}
                    paymentMethod={settledData.method}
                  />
                }
                fileName={`Settlement_${staff.name}_${settledData.month}_${settledData.year}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <Button variant="outline" disabled={pdfLoading} className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Download size={16} />
                    {pdfLoading ? 'Preparing PDF...' : 'Download Settlement Advice'}
                  </Button>
                )}
              </PDFDownloadLink>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400 text-xs">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
