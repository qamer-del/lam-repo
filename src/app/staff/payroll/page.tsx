'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Users, Clock, TrendingUp, Sun, Wallet, Plus, Trash2, Loader2,
  Calendar, ChevronRight, Shield, AlertCircle, BarChart3, History
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { AttendanceEntryModal } from '@/components/attendance-entry-modal'
import { PayrollSettlementModal } from '@/components/payroll-settlement-modal-v2'
import {
  getAllStaffForPayroll,
  getAttendanceRecords,
  getPayrollHistory,
  getUnsettledAdvances,
  getLastSettlement,
  deleteAttendanceRecord,
} from '@/actions/payroll'
import {
  calcPayrollBreakdown,
  type AttendanceDay,
} from '@/lib/payroll-engine'
import { toast } from 'sonner'
import Link from 'next/link'
import { useLanguage } from '@/providers/language-provider'

type StaffWithSettlements = {
  id: number
  name: string
  baseSalary: number
  safetyAllowance: number
  transportAllowance: number
  otherAllowance: number
  overtimeMultiplier: number
  joiningDate?: Date | null
  salarySettlements: any[]
}

export default function PayrollPage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ADMIN'

  const [staff, setStaff] = useState<StaffWithSettlements[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'attendance' | 'history'>('attendance')

  // Attendance for selected staff + period
  const today = new Date()
  const [monthStart] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [historyRecords, setHistoryRecords] = useState<any[]>([])
  const [advances, setAdvances] = useState<{ advancesTotal: number; deductionsTotal: number }>({ advancesTotal: 0, deductionsTotal: 0 })
  const [lastSettlement, setLastSettlement] = useState<any>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllStaffForPayroll()
      setStaff(data as any)
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  const loadStaffData = useCallback(async (staffId: number) => {
    setAttendanceLoading(true)
    try {
      const [records, hist, adv, last] = await Promise.all([
        getAttendanceRecords(staffId, monthStart, today),
        getPayrollHistory(staffId),
        getUnsettledAdvances(staffId),
        getLastSettlement(staffId),
      ])
      setAttendanceRecords(records)
      setHistoryRecords(hist)
      setAdvances({ advancesTotal: adv.advancesTotal, deductionsTotal: adv.deductionsTotal })
      setLastSettlement(last)
    } catch (err) {
      console.error(err)
    } finally {
      setAttendanceLoading(false)
    }
  }, [monthStart])

  useEffect(() => {
    if (status === 'authenticated') loadStaff()
  }, [status])

  useEffect(() => {
    if (selectedId) loadStaffData(selectedId)
  }, [selectedId])

  const selectedStaff = staff.find(s => s.id === selectedId)

  // Next period start
  const nextPeriodFrom = lastSettlement?.settledUpToDate
    ? (() => { const d = new Date(lastSettlement.settledUpToDate); d.setDate(d.getDate() + 1); return d })()
    : new Date(today.getFullYear(), today.getMonth(), 1)

  // Current period attendance
  const attendanceDays: AttendanceDay[] = attendanceRecords.map(r => ({
    date: new Date(r.date),
    clockIn: new Date(r.clockIn),
    clockOut: new Date(r.clockOut),
    workedHours: r.workedHours,
    isFriday: r.isFriday,
    isHoliday: r.isHoliday,
  }))

  // Quick breakdown preview (current month)
  const previewBreakdown = selectedStaff ? calcPayrollBreakdown({
    attendanceRecords: attendanceDays,
    baseSalary: selectedStaff.baseSalary,
    safetyAllowance: selectedStaff.safetyAllowance || 0,
    transportAllowance: selectedStaff.transportAllowance || 0,
    otherAllowance: selectedStaff.otherAllowance || 0,
    overtimeMultiplier: selectedStaff.overtimeMultiplier || 1.5,
    bonus: 0,
    advancesTotal: advances.advancesTotal,
    otherDeductions: advances.deductionsTotal,
    absenceDeduction: 0,
    settlementFrom: nextPeriodFrom,
    settlementTo: today,
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  }) : null

  const handleDeleteAttendance = async (id: number) => {
    if (!confirm('Delete this attendance record?')) return
    try {
      await deleteAttendanceRecord(id)
      toast.success('Record deleted')
      if (selectedId) loadStaffData(selectedId)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-3xl" />)}
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-400 dark:from-white dark:to-gray-500">
            {t('payroll')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
            {t('payrollSubtitle')}
          </p>
        </div>
        <Link href="/staff">
          <Button variant="outline" className="gap-2 rounded-xl border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300">
            <Users size={15} />
            {t('backToStaff')}
          </Button>
        </Link>
      </div>

      {/* ── Staff Selector ───────────────────────────────────────────── */}
      <div className="overflow-x-auto hide-scrollbar -mb-1 pb-1">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-inner w-max min-w-full">
          {staff.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 ${
                selectedId === s.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {selectedStaff && (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Wallet,
                label: t('payrollBasicSalary'),
                value: `${selectedStaff.baseSalary.toLocaleString()} SAR`,
                sub: '1000 SAR / month',
                color: 'blue',
              },
              {
                icon: Shield,
                label: t('payrollSafetyAllowance'),
                value: `${(selectedStaff.safetyAllowance || 0).toLocaleString()} SAR`,
                sub: t('payrollFixedMonthly'),
                color: 'emerald',
              },
              {
                icon: TrendingUp,
                label: t('payrollOtHoursPeriod'),
                value: previewBreakdown ? `${previewBreakdown.overtimeHours.toFixed(1)} hrs` : '—',
                sub: previewBreakdown ? `+ ${previewBreakdown.overtimeAmount.toFixed(2)} SAR` : '',
                color: 'orange',
              },
              {
                icon: Sun,
                label: t('payrollFridayHours'),
                value: previewBreakdown ? `${previewBreakdown.fridayHours.toFixed(1)} hrs` : '—',
                sub: previewBreakdown ? `+ ${previewBreakdown.fridayOvertimeAmount.toFixed(2)} SAR` : '',
                color: 'amber',
              },
            ].map((card, idx) => (
              <div key={idx} className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />
                <div className="relative space-y-3">
                  <div className={`w-10 h-10 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/30 flex items-center justify-center text-${card.color}-600`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.label}</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums mt-1">{card.value}</p>
                    {card.sub && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{card.sub}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Net Payable Card ───────────────────────────────────────── */}
          {previewBreakdown && (
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_70%)]" />
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-emerald-100 mb-1">{t('payrollEstimatedNetSalary')}</p>
                  <p className="text-4xl font-black tabular-nums">
                    {previewBreakdown.netSalary.toFixed(2)} <span className="text-xl text-emerald-200">SAR</span>
                  </p>
                  <p className="text-xs text-emerald-200 mt-2">
                    {t('period')}: {format(nextPeriodFrom, 'MMM d')} → {format(today, 'MMM d, yyyy')}
                    {lastSettlement && (
                      <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-[10px]">
                        {t('payrollLastSettled').replace('{date}', format(new Date(lastSettlement.paidAt), 'MMM d'))}
                      </span>
                    )}
                  </p>
                </div>
                {isAdmin && (
                <PayrollSettlementModal
                    staff={{
                      id: selectedStaff.id,
                      name: selectedStaff.name,
                      baseSalary: selectedStaff.baseSalary,
                      safetyAllowance: selectedStaff.safetyAllowance || 0,
                      transportAllowance: selectedStaff.transportAllowance || 0,
                      otherAllowance: selectedStaff.otherAllowance || 0,
                      overtimeMultiplier: selectedStaff.overtimeMultiplier || 1.5,
                    }}
                    onSettled={() => loadStaffData(selectedId!)}
                  />
                )}
              </div>

              {/* Mini breakdown */}
              <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: t('payrollMiniBasic'), value: previewBreakdown.baseSalaryEarned.toFixed(2) },
                    { label: t('payrollMiniSafety'), value: previewBreakdown.safetyAllowance.toFixed(2) },
                    { label: t('payrollMiniOt'), value: (previewBreakdown.overtimeAmount + previewBreakdown.fridayOvertimeAmount).toFixed(2) },
                    { label: t('payrollMiniAdvances'), value: `−${previewBreakdown.advancesTotal.toFixed(2)}` },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200">{item.label}</p>
                    <p className="text-sm font-black text-white tabular-nums">{item.value} SAR</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {(['attendance', 'history'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                  tab === tabKey
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tabKey === 'attendance' ? <Clock size={14} /> : <History size={14} />}
                {tabKey === 'attendance' ? t('attendance') : t('settlementHistoryShort')}
              </button>
            ))}
            {isAdmin && tab === 'attendance' && (
              <div className="ml-auto">
                <AttendanceEntryModal
                  staffId={selectedId!}
                  staffName={selectedStaff.name}
                  onAdded={() => loadStaffData(selectedId!)}
                />
              </div>
            )}
          </div>

          {attendanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : tab === 'attendance' ? (
            /* ── Attendance Table ───────────────────────────────────── */
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      {t('attendanceRecordsForMonth').replace('{month}', format(today, 'MMMM yyyy'))}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      {t('daysLogged').replace('{count}', String(attendanceRecords.length))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> {t('official')}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> {t('ot')}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> {t('friday')}</span>
                  </div>
                </div>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Clock size={28} />
                  </div>
                  <p className="text-gray-500 font-medium">{t('noAttendanceRecordsThisPeriod')}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {isAdmin ? t('clickLogAttendanceToAdd') : t('noRecordsLoggedYet')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-transparent">
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400 pl-6">{t('date')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('clockIn')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('clockOut')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('total')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('official')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('ot')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('type')}</TableHead>
                        {isAdmin && <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400 pr-6 text-right">{t('action')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map(record => {
                        const worked = record.workedHours
                        const isFri = record.isFriday
                        const official = isFri ? 0 : Math.min(worked, 8)
                        const ot = isFri ? worked : Math.max(0, worked - 8)

                        return (
                          <TableRow key={record.id} className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${isFri ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                            <TableCell className="pl-6 py-3">
                              <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">
                                  {format(new Date(record.date), 'EEE, MMM d')}
                                </p>
                                {record.note && <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{record.note}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(record.clockIn), 'HH:mm')}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(record.clockOut), 'HH:mm')}
                            </TableCell>
                            <TableCell className="font-black text-sm text-gray-900 dark:text-white tabular-nums">
                              {worked.toFixed(1)}h
                            </TableCell>
                            <TableCell className="font-bold text-sm text-blue-600 tabular-nums">
                              {official.toFixed(1)}h
                            </TableCell>
                            <TableCell className={`font-bold text-sm tabular-nums ${isFri ? 'text-amber-600' : 'text-orange-600'}`}>
                              {ot.toFixed(1)}h
                            </TableCell>
                            <TableCell>
                              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                                isFri
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : ot > 0
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {isFri ? 'Friday OT' : ot > 0 ? 'OT' : 'Regular'}
                              </span>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="pr-6 text-right">
                                <button
                                  onClick={() => handleDeleteAttendance(record.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            /* ── Settlement History ─────────────────────────────────── */
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">{t('settlementHistoryShort')}</h3>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {t('settlementsCount').replace('{count}', String(historyRecords.length))}
                </p>
              </div>

              {historyRecords.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-gray-400 font-medium">{t('settlementReportsEmpty')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-transparent">
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400 pl-6">{t('period')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('payrollMiniBasic')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('ot')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('payrollMiniSafety')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('bonus')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('advances')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('netPaid')}</TableHead>
                        <TableHead className="h-10 text-[10px] font-black uppercase tracking-wider text-gray-400 pr-6">{t('methodLabel')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyRecords.map(s => (
                        <TableRow key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <TableCell className="pl-6 py-3">
                            <p className="font-bold text-sm text-gray-900 dark:text-white">
                              {s.settlementFrom
                                ? `${format(new Date(s.settlementFrom), 'MMM d')} → ${format(new Date(s.settledUpToDate), 'MMM d, yyyy')}`
                                : format(new Date(s.year, s.month - 1), 'MMMM yyyy')}
                            </p>
                            <p className="text-[10px] text-gray-400">{format(new Date(s.paidAt), 'PPP')}</p>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-bold text-gray-600 dark:text-gray-400">
                            {(s.earnedSalary || s.baseSalary).toFixed(2)}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-bold text-orange-600">
                            {((s.overtimeAmount || 0) + (s.fridayOvertimeAmount || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-bold text-emerald-600">
                            {(s.safetyAllowance || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-bold text-purple-600">
                            {(s.bonus || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-bold text-red-500">
                            −{s.advancesTally.toFixed(2)}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-black text-emerald-700 dark:text-emerald-400">
                            {s.netPaid.toFixed(2)} SAR
                          </TableCell>
                          <TableCell className="pr-6">
                            <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                              {s.method}
                              {s.cashSource
                                ? ` / ${s.cashSource === 'SALARY_FUND' ? t('fund') : t('drawer')}`
                                : ''}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
