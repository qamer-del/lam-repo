'use client'

import { useEffect, useState } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { getAbsenceRecords, deleteAbsenceRecord } from '@/actions/staff'
import { AbsenceRecordModal } from '@/components/absence-record-modal'
import { toast } from 'sonner'

type AbsenceRecord = {
  id: number
  hours: number
  reason: string | null
  createdAt: Date
  recordedBy?: { name: string } | null
}

export function AbsencesTab({ staffId, staffName, hourlyRate }: { staffId: number; staffName: string; hourlyRate: number }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<AbsenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  const month = currentMonth.getMonth() + 1
  const year = currentMonth.getFullYear()

  const fetchRecords = () => {
    setLoading(true)
    getAbsenceRecords(staffId, month, year)
      .then(data => setRecords(data as any))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecords() }, [staffId, currentMonth])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this absence record?')) return
    setDeleting(id)
    try {
      await deleteAbsenceRecord(id)
      toast.success('Record deleted')
      fetchRecords()
    } catch (err: any) {
      toast.error('Failed to delete', { description: err.message })
    } finally {
      setDeleting(null)
    }
  }

  const totalHours = records.reduce((s, r) => s + r.hours, 0)
  const totalDeduction = totalHours * hourlyRate

  return (
    <div className="max-w-4xl space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-black text-gray-900 dark:text-white min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <AbsenceRecordModal
          staffId={staffId}
          staffName={staffName}
          hourlyRate={hourlyRate}
          month={month}
          year={year}
          existingRecords={records}
          onRefresh={fetchRecords}
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{totalHours.toFixed(1)} <span className="text-sm text-gray-400">hrs</span></p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Total Absence Hours</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black tabular-nums text-red-500">{totalDeduction.toFixed(2)} <span className="text-sm text-red-300">SAR</span></p>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-1">Total Deduction</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reason</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Hours</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Deduction</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right hidden sm:block">Date Recorded</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right"></p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-bold text-gray-500">No absence records for {format(currentMonth, 'MMMM yyyy')}</p>
          </div>
        ) : (
          records.map(r => (
            <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors items-center">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.reason || 'Unexcused Absence'}</p>
                {r.recordedBy && <p className="text-[10px] text-gray-400 mt-0.5">By: {r.recordedBy.name}</p>}
              </div>
              <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums text-right self-center">
                {r.hours.toFixed(1)}h
              </p>
              <p className="text-sm font-black text-red-500 tabular-nums text-right self-center">
                {(r.hours * hourlyRate).toFixed(2)} SAR
              </p>
              <p className="text-xs font-medium text-gray-400 text-right self-center hidden sm:block">
                {format(new Date(r.createdAt), 'dd MMM yy HH:mm')}
              </p>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-40"
              >
                {deleting === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
