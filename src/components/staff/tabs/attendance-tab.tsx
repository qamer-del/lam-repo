'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, ChevronLeft, ChevronRight, Trash2, Loader2, Sun } from 'lucide-react'
import { getAttendanceRecords, deleteAttendanceRecord } from '@/actions/payroll'
import { AttendanceEntryModal } from '@/components/attendance-entry-modal'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { classifyDayHours } from '@/lib/payroll-engine'

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

interface AttendanceTabProps {
  staffId: number
  staffName: string
}

export function AttendanceTab({ staffId, staffName }: AttendanceTabProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = startOfMonth(currentMonth)
      const to = endOfMonth(currentMonth)
      const data = await getAttendanceRecords(staffId, from, to)
      setRecords(
        data.map(r => ({
          ...r,
          date: new Date(r.date),
          clockIn: new Date(r.clockIn),
          clockOut: new Date(r.clockOut),
        })),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [staffId, currentMonth])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await deleteAttendanceRecord(id)
      toast.success('Record deleted')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  // Totals
  const totals = records.reduce(
    (acc, r) => {
      const cls = classifyDayHours({
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        workedHours: r.workedHours,
        isFriday: r.isFriday,
        isHoliday: r.isHoliday,
      })
      acc.official += cls.officialHours
      acc.overtime += cls.overtimeHours
      acc.friday += cls.fridayHours
      acc.total += r.workedHours
      return acc
    },
    { official: 0, overtime: 0, friday: 0, total: 0 },
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <span className="text-sm font-black text-gray-900 dark:text-white min-w-[130px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
        {/*
          AttendanceEntryModal manages its own open/close state via an internal
          DialogTrigger. We pass onAdded={load} so the list refreshes on save.
        */}
        <AttendanceEntryModal staffId={staffId} staffName={staffName} onAdded={load} />
      </div>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Days', value: records.length, color: 'text-gray-900 dark:text-white' },
            { label: 'Official Hrs', value: totals.official.toFixed(1), color: 'text-blue-600' },
            { label: 'Overtime Hrs', value: totals.overtime.toFixed(1), color: 'text-orange-600' },
            { label: 'Friday Hrs', value: totals.friday.toFixed(1), color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 text-center">
              <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Records table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
            <Clock size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-400">
            No attendance records for {format(currentMonth, 'MMMM yyyy')}
          </p>
          <AttendanceEntryModal staffId={staffId} staffName={staffName} onAdded={load} />
        </div>
      ) : (
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/60">
                {['Date', 'Clock In', 'Clock Out', 'Total', 'Official', 'OT', 'Type', ''].map(h => (
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
              {records.map(r => {
                const cls = classifyDayHours({
                  date: r.date,
                  clockIn: r.clockIn,
                  clockOut: r.clockOut,
                  workedHours: r.workedHours,
                  isFriday: r.isFriday,
                  isHoliday: r.isHoliday,
                })
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {format(r.date, 'EEE, MMM d')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 tabular-nums">
                      {format(r.clockIn, 'h:mm a')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 tabular-nums">
                      {format(r.clockOut, 'h:mm a')}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-gray-900 dark:text-white">
                      {r.workedHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 tabular-nums text-blue-600">
                      {cls.officialHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 tabular-nums text-orange-600">
                      {(cls.overtimeHours + cls.fridayHours).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3">
                      {r.isFriday ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full px-2 py-0.5">
                          <Sun size={10} /> FRI
                        </span>
                      ) : r.isHoliday ? (
                        <span className="text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full px-2 py-0.5">
                          HOL
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full px-2 py-0.5">
                          REG
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        {deletingId === r.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
