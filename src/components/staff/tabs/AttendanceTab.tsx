'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Trash2, Clock } from 'lucide-react'
import { getAttendanceRecords, deleteAttendanceRecord } from '@/actions/payroll'
import { AttendanceEntryModal } from '@/components/attendance-entry-modal'
import { toast } from 'sonner'

type AttendanceRecord = {
  id: number
  date: Date
  clockIn: Date
  clockOut: Date
  workedHours: number
  isFriday: boolean
  isHoliday: boolean
  note?: string | null
}

export function AttendanceTab({ staffId, staffName }: { staffId: number; staffName: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchRecords = () => {
    setLoading(true)
    const from = startOfMonth(currentMonth)
    const to = endOfMonth(currentMonth)
    getAttendanceRecords(staffId, from, to)
      .then(data => setRecords(data as any))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecords() }, [staffId, currentMonth])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this attendance record?')) return
    setDeleting(id)
    try {
      await deleteAttendanceRecord(id)
      toast.success('Record deleted')
      fetchRecords()
    } catch (err: any) {
      toast.error('Failed to delete', { description: err.message })
    } finally {
      setDeleting(null)
    }
  }

  // Totals
  let totalOfficial = 0, totalOT = 0, totalFriday = 0
  for (const r of records) {
    if (r.isFriday) {
      totalFriday += r.workedHours
    } else {
      totalOfficial += Math.min(r.workedHours, 8)
      totalOT += Math.max(0, r.workedHours - 8)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Month navigator + Add button */}
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
            disabled={currentMonth >= new Date()}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <AttendanceEntryModal
          staffId={staffId}
          staffName={staffName}
          onAdded={fetchRecords}
        />
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Days Logged', value: records.length.toString(), color: 'text-gray-900 dark:text-white' },
          { label: 'Official Hrs', value: totalOfficial.toFixed(1), color: 'text-blue-600' },
          { label: 'OT Hrs', value: totalOT.toFixed(1), color: 'text-orange-600' },
          { label: 'Friday Hrs', value: totalFriday.toFixed(1), color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 text-center">
            <p className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Clock In</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Clock Out</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Hours</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-right"></p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-bold text-gray-500">No attendance records for {format(currentMonth, 'MMMM yyyy')}</p>
            <p className="text-xs text-gray-400 mt-1">Click "Log Attendance" to add records</p>
          </div>
        ) : (
          records
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(r => {
              const official = r.isFriday ? 0 : Math.min(r.workedHours, 8)
              const ot = r.isFriday ? 0 : Math.max(0, r.workedHours - 8)
              const friday = r.isFriday ? r.workedHours : 0

              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {format(new Date(r.date), 'EEE, dd MMM')}
                    </p>
                    <div className="flex gap-1 mt-0.5">
                      {r.isFriday && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">FRIDAY OT</span>
                      )}
                      {ot > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">+{ot.toFixed(1)}h OT</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-mono font-bold text-gray-500 text-right">
                    {format(new Date(r.clockIn), 'HH:mm')}
                  </p>
                  <p className="text-xs font-mono font-bold text-gray-500 text-right">
                    {format(new Date(r.clockOut), 'HH:mm')}
                  </p>
                  <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums text-right">
                    {r.workedHours.toFixed(1)}h
                  </p>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-40"
                  >
                    {deleting === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              )
            })
        )}
      </div>
    </div>
  )
}
