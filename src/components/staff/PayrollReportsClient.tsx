'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, Download, Filter, FileText } from 'lucide-react'
import {
  getPayrollSummaryReport,
  getAttendanceReport,
  getOvertimeReport,
  getAdvanceDeductionReport,
  getEmployeePayrollReport
} from '@/actions/payroll-reports'

type TabId = 'summary' | 'attendance' | 'overtime' | 'advances' | 'employee'

export function PayrollReportsClient({ staffList }: { staffList: { id: number; name: string }[] }) {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || 0)
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    let active = true
    setLoading(true)

    const fetcher = async () => {
      try {
        let result: any[] = []
        if (activeTab === 'summary') result = await getPayrollSummaryReport(year)
        else if (activeTab === 'attendance') result = await getAttendanceReport(year, month)
        else if (activeTab === 'overtime') result = await getOvertimeReport(year)
        else if (activeTab === 'advances') result = await getAdvanceDeductionReport(year)
        else if (activeTab === 'employee') result = await getEmployeePayrollReport(selectedStaffId, year)
        
        if (active) setData(result)
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetcher()
    return () => { active = false }
  }, [activeTab, year, month, selectedStaffId])

  const exportCSV = () => {
    if (data.length === 0) return
    
    let csv = ''
    let filename = `report_${activeTab}_${year}.csv`

    if (activeTab === 'summary') {
      csv = 'Employee,Total Paid,Avg Monthly,Last Settled\n' + 
        data.map(r => `"${r.name}",${r.totalPaid.toFixed(2)},${r.avgMonthly.toFixed(2)},${r.lastPaidAt ? format(new Date(r.lastPaidAt), 'yyyy-MM-dd') : 'Never'}`).join('\n')
    } else if (activeTab === 'attendance') {
      filename = `report_attendance_${year}_${month}.csv`
      csv = 'Employee,Days Logged,Total Hrs,OT Hrs,Friday Hrs\n' +
        data.map(r => `"${r.name}",${r.days},${r.totalHours.toFixed(1)},${r.otHours.toFixed(1)},${r.fridayHours.toFixed(1)}`).join('\n')
    } else if (activeTab === 'overtime') {
      csv = 'Employee,OT Hrs,Friday Hrs,OT Amount,Friday OT Amount,Total OT Pay\n' +
        data.map(r => `"${r.name}",${r.overtimeHours.toFixed(1)},${r.fridayHours.toFixed(1)},${r.overtimeAmount.toFixed(2)},${r.fridayOvertimeAmount.toFixed(2)},${r.totalOTPay.toFixed(2)}`).join('\n')
    } else if (activeTab === 'advances') {
      csv = 'Employee,Total Advanced,Total Recovered,Balance\n' +
        data.map(r => `"${r.name}",${r.totalAdvanced.toFixed(2)},${r.totalRecovered.toFixed(2)},${r.balance.toFixed(2)}`).join('\n')
    } else if (activeTab === 'employee') {
      const staffName = staffList.find(s => s.id === selectedStaffId)?.name || 'Employee'
      filename = `report_${staffName.replace(/\s+/g, '_')}_${year}.csv`
      csv = 'Month,Base Salary,Target Adj,OT Pay,Advances Deducted,Net Paid,Method,Paid At\n' +
        data.map(s => `${s.month}/${s.year},${s.baseSalary.toFixed(2)},${s.targetSalaryAdjustment.toFixed(2)},${(s.overtimeAmount + s.fridayOvertimeAmount).toFixed(2)},${s.advancesTally.toFixed(2)},${s.netPaid.toFixed(2)},${s.method},${format(new Date(s.paidAt), 'yyyy-MM-dd')}`).join('\n')
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'summary', label: 'Payroll Summary' },
    { id: 'attendance', label: 'Attendance Hours' },
    { id: 'overtime', label: 'Overtime Analysis' },
    { id: 'advances', label: 'Advance Deductions' },
    { id: 'employee', label: 'Employee History' },
  ]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Filter size={14} className="text-gray-400" />
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none"
            >
              {[0, 1, 2, 3].map(i => {
                const y = new Date().getFullYear() - i
                return <option key={y} value={y}>{y}</option>
              })}
            </select>
          </div>

          {activeTab === 'attendance' && (
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white outline-none"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i+1} value={i+1}>{format(new Date(2000, i, 1), 'MMM')}</option>
              ))}
            </select>
          )}

          {activeTab === 'employee' && (
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(Number(e.target.value))}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white outline-none"
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={exportCSV}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-bold text-gray-400">Generating report...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <FileText className="w-12 h-12 text-gray-200 dark:text-gray-800" />
              <p className="text-sm font-bold text-gray-500">No data found for this period.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                <tr>
                  {activeTab === 'summary' && (
                    <>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Employee</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Total Paid</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Avg Monthly</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Last Settled</th>
                    </>
                  )}
                  {activeTab === 'attendance' && (
                    <>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Employee</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-center">Days</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Total Hrs</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">OT Hrs</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Friday Hrs</th>
                    </>
                  )}
                  {activeTab === 'overtime' && (
                    <>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Employee</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">OT Hrs</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Fri Hrs</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">OT Amount</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Total OT Pay</th>
                    </>
                  )}
                  {activeTab === 'advances' && (
                    <>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Employee</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Total Adv</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Recovered</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Balance</th>
                    </>
                  )}
                  {activeTab === 'employee' && (
                    <>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Period</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Net Paid</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Advances</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">OT Pay</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Method</th>
                      <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    {activeTab === 'summary' && (
                      <>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-emerald-600">{r.totalPaid.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-500">{r.avgMonthly.toFixed(2)}</td>
                        <td className="px-6 py-4 text-gray-500">{r.lastPaidAt ? format(new Date(r.lastPaidAt), 'dd MMM yyyy') : '—'}</td>
                      </>
                    )}
                    {activeTab === 'attendance' && (
                      <>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="px-6 py-4 text-center tabular-nums">{r.days}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-blue-600">{r.totalHours.toFixed(1)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-orange-500">{r.otHours.toFixed(1)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-amber-500">{r.fridayHours.toFixed(1)}</td>
                      </>
                    )}
                    {activeTab === 'overtime' && (
                      <>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{r.overtimeHours.toFixed(1)}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{r.fridayHours.toFixed(1)}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{r.overtimeAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-orange-600">{r.totalOTPay.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'advances' && (
                      <>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-red-500">{r.totalAdvanced.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-emerald-500">{r.totalRecovered.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-gray-900 dark:text-white">{r.balance.toFixed(2)}</td>
                      </>
                    )}
                    {activeTab === 'employee' && (
                      <>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{format(new Date(r.year, r.month - 1), 'MMM yyyy')}</td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-emerald-600">{r.netPaid.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-red-500">{r.advancesTally > 0 ? `-${r.advancesTally.toFixed(2)}` : '—'}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-orange-500">{(r.overtimeAmount + r.fridayOvertimeAmount) > 0 ? `+${(r.overtimeAmount + r.fridayOvertimeAmount).toFixed(2)}` : '—'}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{r.method}</td>
                        <td className="px-6 py-4 text-gray-500">{format(new Date(r.paidAt), 'dd MMM yyyy')}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
