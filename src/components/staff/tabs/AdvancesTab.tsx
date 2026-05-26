'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Loader2, Plus, ChevronLeft, ChevronRight, CreditCard, DollarSign } from 'lucide-react'
import { getStaffAdvancesTab } from '@/actions/payroll'
import { AddTransactionModal } from '@/components/add-transaction-modal'

type Filter = 'all' | 'pending' | 'settled'

type AdvanceTx = {
  id: number
  type: string
  amount: number
  description: string | null
  createdAt: Date
  isSettled: boolean
  salarySettlement?: {
    id: number
    month: number
    year: number
    paidAt: Date
  } | null
}

export function AdvancesTab({ staffId, staffName }: { staffId: number; staffName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    transactions: AdvanceTx[]
    total: number
    totalPages: number
  }>({ transactions: [], total: 0, totalPages: 0 })
  const [advanceOpen, setAdvanceOpen] = useState(false)

  const fetchData = (f = filter, p = page) => {
    setLoading(true)
    getStaffAdvancesTab(staffId, f, p)
      .then(res => setData(res as any))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [staffId, filter, page])

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'settled', label: 'Settled' },
  ]

  return (
    <div className="max-w-3xl space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Filter pills */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                filter === f.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Add advance button */}
        <button
          onClick={() => setAdvanceOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus size={14} />
          Add Advance
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right hidden sm:block">Date</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Status</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : data.transactions.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-bold text-gray-500">No {filter !== 'all' ? filter : ''} advances found</p>
            <p className="text-xs text-gray-400 mt-1">Record an advance using the button above</p>
          </div>
        ) : (
          data.transactions.map(tx => (
            <div
              key={tx.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
            >
              {/* Description */}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {tx.description || `${tx.type.charAt(0) + tx.type.slice(1).toLowerCase()} #${tx.id}`}
                </p>
                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md mt-0.5 ${
                  tx.type === 'ADVANCE'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {tx.type === 'ADVANCE' ? <CreditCard size={8} /> : <DollarSign size={8} />}
                  {tx.type}
                </span>
              </div>

              {/* Amount */}
              <p className={`text-sm font-black tabular-nums text-right self-center ${
                tx.type === 'ADVANCE' ? 'text-amber-600' : 'text-red-500'
              }`}>
                {tx.amount.toFixed(2)} SAR
              </p>

              {/* Date */}
              <p className="text-xs font-medium text-gray-400 text-right self-center hidden sm:block whitespace-nowrap">
                {format(new Date(tx.createdAt), 'dd MMM yy')}
              </p>

              {/* Status */}
              <div className="self-center">
                {tx.isSettled ? (
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap">
                    Settled
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
                    Pending
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">
            {data.total} total · Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Advance modal */}
      <AddTransactionModal
        open={advanceOpen}
        onOpenChange={v => {
          setAdvanceOpen(v)
          if (!v) { setPage(1); fetchData(filter, 1); router.refresh() }
        }}
        hideTrigger
      />
    </div>
  )
}
