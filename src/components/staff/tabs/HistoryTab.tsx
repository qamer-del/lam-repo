'use client'

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Loader2, Calendar, FileText } from 'lucide-react'
import { getPayrollHistory } from '@/actions/payroll'
import { SalarySettlementPdfButton } from '@/components/salary-settlement-pdf-button'

type Settlement = {
  id: number
  month: number
  year: number
  baseSalary: number
  earnedSalary: number | null
  workedDays: number | null
  totalDays: number | null
  safetyAllowance: number
  transportAllowance: number
  otherAllowance: number
  bonus: number
  officialHours: number
  overtimeHours: number
  fridayHours: number
  overtimeAmount: number
  fridayOvertimeAmount: number
  advancesTally: number
  absenceHours: number
  absenceDeduction: number
  netPaid: number
  method: string
  paidAt: Date
  settledFrom: Date | null
  settledUpToDate: Date | null
  transactions: { id: number; amount: number; method: string }[]
}

export function HistoryTab({ staffId, staffName, idNumber, nationality }: { staffId: number; staffName: string; idNumber: string | null; nationality: string | null }) {
  const [history, setHistory] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    getPayrollHistory(staffId)
      .then(data => setHistory(data as any))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [staffId])

  const years = useMemo(() => {
    const y = new Set(history.map(s => s.year))
    y.add(new Date().getFullYear())
    return Array.from(y).sort((a, b) => b - a)
  }, [history])

  const filteredHistory = history.filter(s => s.year === selectedYear)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Year filter */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-max">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${
              selectedYear === y
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm font-bold text-gray-500">No payroll history for {selectedYear}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map(s => {
            const isExpanded = expandedId === s.id
            const periodStr = s.settledFrom && s.settledUpToDate
              ? `${format(new Date(s.settledFrom), 'dd MMM yyyy')} → ${format(new Date(s.settledUpToDate), 'dd MMM yyyy')}`
              : `${format(new Date(s.year, s.month - 1), 'MMMM yyyy')} (Legacy)`

            return (
              <div key={s.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden transition-all duration-200">
                {/* Header row (clickable) */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {periodStr}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1 flex items-center gap-2">
                        {s.workedDays && s.totalDays ? `${s.workedDays}/${s.totalDays} Days` : 'Full Month'}
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        Paid {format(new Date(s.paidAt), 'dd MMM yy')}
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        {s.method}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-black text-emerald-600 tabular-nums">
                      {s.netPaid.toFixed(2)} SAR
                    </p>
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12">
                    
                    {/* Earnings */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">Earnings</p>
                      <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Basic Salary (Earned)</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{(s.earnedSalary ?? s.baseSalary).toFixed(2)}</span>
                      </div>
                      {s.safetyAllowance > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Safety Allowance</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{s.safetyAllowance.toFixed(2)}</span>
                        </div>
                      )}
                      {s.transportAllowance > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Transport Allowance</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{s.transportAllowance.toFixed(2)}</span>
                        </div>
                      )}
                      {s.otherAllowance > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Other Allowance</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{s.otherAllowance.toFixed(2)}</span>
                        </div>
                      )}
                      {(s.overtimeAmount > 0 || s.fridayOvertimeAmount > 0) && (
                        <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Overtime Pay ({(s.overtimeHours + s.fridayHours).toFixed(1)}h)</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{(s.overtimeAmount + s.fridayOvertimeAmount).toFixed(2)}</span>
                        </div>
                      )}
                      {s.bonus > 0 && (
                        <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Bonus</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{s.bonus.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Deductions & Footer */}
                    <div className="flex flex-col">
                      <div className="space-y-1 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">Deductions</p>
                        {s.advancesTally > 0 && (
                          <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Advances Recovery</span>
                            <span className="text-xs font-bold text-red-500">−{s.advancesTally.toFixed(2)}</span>
                          </div>
                        )}
                        {s.absenceDeduction > 0 && (
                          <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Absence Deduction ({s.absenceHours.toFixed(1)}h)</span>
                            <span className="text-xs font-bold text-red-500">−{s.absenceDeduction.toFixed(2)}</span>
                          </div>
                        )}
                        {s.advancesTally === 0 && s.absenceDeduction === 0 && (
                          <p className="text-xs text-gray-400 italic">No deductions</p>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <SalarySettlementPdfButton
                             staffName={staffName}
                             idNumber={idNumber || undefined}
                             nationality={nationality || undefined}
                             settlement={s}
                           />
                           <span className="text-[10px] font-bold text-gray-500 uppercase">Print PDF</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Net Paid</p>
                          <p className="text-xl font-black text-emerald-600 tabular-nums">{s.netPaid.toFixed(2)} SAR</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
