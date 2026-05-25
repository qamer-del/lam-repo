'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, Loader2 } from 'lucide-react'
import { getPayrollHistory } from '@/actions/payroll'
import { SalarySettlementPdfButton } from '@/components/salary-settlement-pdf-button'
import { format } from 'date-fns'

type Settlement = {
  id: number
  month: number
  year: number
  settlementFrom?: Date | null
  settledUpToDate?: Date | null
  baseSalary: number
  earnedSalary?: number | null
  workedDays?: number | null
  totalDays?: number | null
  safetyAllowance: number
  overtimeAmount: number
  fridayOvertimeAmount: number
  bonus: number
  advancesTally: number
  netPaid: number
  method: string
  paidAt: Date
}

interface HistoryTabProps {
  staffId: number
  staffName: string
}

export function HistoryTab({ staffId, staffName }: HistoryTabProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPayrollHistory(staffId)
      setSettlements(
        data.map((s: any) => ({
          ...s,
          settlementFrom: s.settlementFrom ? new Date(s.settlementFrom) : null,
          settledUpToDate: s.settledUpToDate ? new Date(s.settledUpToDate) : null,
          paidAt: new Date(s.paidAt),
        })),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    load()
  }, [load])

  const methodBadge = (method: string) => {
    const map: Record<string, string> = {
      CASH: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      NETWORK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    }
    return map[method] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
            <History size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-400">No settlement history yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map(s => (
            <div
              key={s.id}
              className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gray-50 dark:bg-gray-900/60 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    {s.settlementFrom && s.settledUpToDate
                      ? `${format(s.settlementFrom, 'MMM d')} – ${format(s.settledUpToDate, 'MMM d, yyyy')}`
                      : `${s.month}/${s.year}`}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Paid {format(s.paidAt, 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase rounded-full px-2 py-0.5 ${methodBadge(s.method)}`}
                  >
                    {s.method}
                  </span>
                  {/*
                    SalarySettlementPdfButton accepts: staffName, settlement (any),
                    and optional idNumber/nationality. We pass only what we have.
                  */}
                  <SalarySettlementPdfButton settlement={s} staffName={staffName} />
                </div>
              </div>
              {/* Breakdown grid */}
              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Basic Earned',
                    value: (s.earnedSalary ?? s.baseSalary).toFixed(2),
                    sub:
                      s.workedDays && s.totalDays
                        ? `${s.workedDays}/${s.totalDays} days`
                        : '',
                    negative: false,
                    highlight: false,
                  },
                  {
                    label: 'OT + Safety',
                    value: (
                      s.overtimeAmount +
                      s.fridayOvertimeAmount +
                      s.safetyAllowance
                    ).toFixed(2),
                    sub: '',
                    negative: false,
                    highlight: false,
                  },
                  {
                    label: 'Advances',
                    value: `−${s.advancesTally.toFixed(2)}`,
                    sub: '',
                    negative: true,
                    highlight: false,
                  },
                  {
                    label: 'Net Paid',
                    value: s.netPaid.toFixed(2),
                    sub: '',
                    negative: false,
                    highlight: true,
                  },
                ].map(({ label, value, sub, negative, highlight }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">
                      {label}
                    </p>
                    <p
                      className={`text-sm font-black tabular-nums mt-0.5 ${
                        highlight
                          ? 'text-emerald-600'
                          : negative
                            ? 'text-red-500'
                            : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {value} SAR
                    </p>
                    {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
