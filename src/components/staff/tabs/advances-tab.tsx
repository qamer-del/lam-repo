'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, ChevronLeft, ChevronRight, CheckCircle2, Clock, Wallet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getStaffAdvances } from '@/actions/staff'
import { AddAdvanceDialog } from '@/components/staff/dialogs/add-advance-dialog'
import { format } from 'date-fns'

type AdvanceItem = {
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

type FilterType = 'all' | 'pending' | 'settled'

interface AdvancesTabProps {
  staffId: number
  staffName: string
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'settled', label: 'Settled' },
]

export function AdvancesTab({ staffId, staffName }: AdvancesTabProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdvanceItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [currentData, pendingData] = await Promise.all([
        getStaffAdvances(staffId, filter, page),
        getStaffAdvances(staffId, 'pending', 1, 1000),
      ])
      setItems(currentData.items.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })))
      setTotal(currentData.total)
      setTotalPages(currentData.totalPages)
      setPendingTotal(pendingData.items.reduce((s: number, t: any) => s + t.amount, 0))
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [staffId, filter, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                filter === f.value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs">
          <Plus size={13} /> Add Advance
        </Button>
      </div>

      {/* Pending summary */}
      {pendingTotal > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet size={16} className="text-amber-600" />
            <div>
              <p className="text-xs font-black text-amber-700 dark:text-amber-400">Total Pending Advances</p>
              <p className="text-[10px] text-amber-500">Will be deducted in next salary settlement</p>
            </div>
          </div>
          <p className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-400">
            {pendingTotal.toFixed(2)} SAR
          </p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-400">
            {filter === 'pending' ? 'No pending advances' : filter === 'settled' ? 'No settled advances' : 'No advances recorded'}
          </p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-2 text-xs">
            <Plus size={13} /> Record First Advance
          </Button>
        </div>
      ) : (
        <>
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/60">
                  {['Date', 'Type', 'Amount', 'Description', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {format(tx.createdAt, 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black uppercase rounded-full px-2 py-0.5 ${
                        tx.type === 'ADVANCE'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{tx.type}</span>
                    </td>
                    <td className="px-4 py-3 font-black tabular-nums text-gray-900 dark:text-white">
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
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400">{total} records</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AddAdvanceDialog
        staffId={staffId}
        staffName={staffName}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={load}
      />
    </div>
  )
}
