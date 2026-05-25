'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { getStaffTransactions } from '@/actions/staff'
import { format } from 'date-fns'

type TxItem = {
  id: number
  type: string
  amount: number
  method: string
  description: string | null
  isSettled: boolean
  createdAt: Date
  salarySettlementId: number | null
  recordedBy: { name: string } | null
}

interface TransactionsTabProps {
  staffId: number
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'settled', label: 'Settled' },
  { value: 'ADVANCE', label: 'Advances' },
  { value: 'EXPENSE', label: 'Expenses' },
  { value: 'SALARY_PAYMENT', label: 'Salary Payments' },
]

const TYPE_COLORS: Record<string, string> = {
  ADVANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  EXPENSE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SALARY_PAYMENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export function TransactionsTab({ staffId }: TransactionsTabProps) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<TxItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getStaffTransactions(staffId, filter, page)
      setItems(data.items.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })))
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [staffId, filter, page])

  useEffect(() => {
    load()
  }, [load])

  // Reset to page 1 whenever filter changes
  useEffect(() => {
    setPage(1)
  }, [filter])

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              filter === opt.value
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Receipt size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No transactions found</p>
        </div>
      ) : (
        <>
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/60">
                  {['#ID', 'Date', 'Type', 'Amount', 'Description', 'Status'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.map(tx => (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-[11px] font-black text-gray-400">#{tx.id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {format(tx.createdAt, 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-black uppercase rounded-full px-2 py-0.5 ${
                          TYPE_COLORS[tx.type] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black tabular-nums text-gray-900 dark:text-white">
                      {tx.type === 'SALARY_PAYMENT' ? '+' : '−'}
                      {tx.amount.toFixed(2)} SAR
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {tx.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.isSettled ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600">
                          <CheckCircle2 size={11} /> Settled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-500">
                          <Clock size={11} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-gray-400 font-medium">{total} transactions</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
