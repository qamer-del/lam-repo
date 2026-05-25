'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { addAbsenceRecord, deleteAbsenceRecord, getAbsenceRecords } from '@/actions/staff'
import { format, addMonths, subMonths } from 'date-fns'
import { toast } from 'sonner'

type AbsenceRecord = {
  id: number
  hours: number
  reason: string | null
  createdAt: Date
  recordedBy?: { name: string } | null
}

interface AbsencesTabProps {
  staffId: number
  hourlyRate: number
}

export function AbsencesTab({ staffId, hourlyRate }: AbsencesTabProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<AbsenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [hours, setHours] = useState('')
  const [reason, setReason] = useState('')

  const month = currentMonth.getMonth() + 1
  const year = currentMonth.getFullYear()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAbsenceRecords(staffId, month, year)
      setRecords(data.map(r => ({ ...r, createdAt: new Date(r.createdAt) })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [staffId, month, year])

  useEffect(() => {
    load()
  }, [load])

  const totalHours = records.reduce((s, r) => s + r.hours, 0)
  const totalDeduction = totalHours * hourlyRate
  const previewDeduction = hours ? parseFloat(hours) * hourlyRate : 0

  const handleAdd = async () => {
    const h = parseFloat(hours)
    if (!h || h <= 0) return toast.error('Enter valid hours')
    setAddLoading(true)
    try {
      await addAbsenceRecord({ staffId, month, year, hours: h, reason: reason || undefined })
      toast.success(`Absence recorded — deduction: ${previewDeduction.toFixed(2)} SAR`)
      setHours('')
      setReason('')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await deleteAbsenceRecord(id)
      toast.success('Record removed')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Month navigator */}
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
      </div>

      {/* Summary */}
      {records.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xl font-black text-red-700 dark:text-red-400 tabular-nums">
              {totalHours.toFixed(1)}
            </p>
            <p className="text-[9px] font-black uppercase text-red-400 tracking-wide">Total Hrs</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-red-700 dark:text-red-400 tabular-nums">
              {totalDeduction.toFixed(2)}
            </p>
            <p className="text-[9px] font-black uppercase text-red-400 tracking-wide">
              Deduction (SAR)
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-red-700 dark:text-red-400 tabular-nums">
              {hourlyRate.toFixed(2)}
            </p>
            <p className="text-[9px] font-black uppercase text-red-400 tracking-wide">SAR/hr</p>
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Record Absence
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">Hours</Label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="e.g. 8"
                value={hours}
                onChange={e => setHours(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {hours && parseFloat(hours) > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500">
                  −{previewDeduction.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">Reason</Label>
            <input
              type="text"
              placeholder="e.g. Sick leave"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
        <Button
          onClick={handleAdd}
          disabled={addLoading || !hours || parseFloat(hours) <= 0}
          className="w-full bg-red-600 hover:bg-red-700 gap-2 text-sm"
        >
          {addLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Absence Record
        </Button>
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">
            No absence records for {format(currentMonth, 'MMMM yyyy')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div
              key={r.id}
              className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3"
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-red-600">{r.hours} hrs</span>
                  <span className="text-xs text-gray-400">
                    = {(r.hours * hourlyRate).toFixed(2)} SAR
                  </span>
                </div>
                {r.reason && <p className="text-xs text-gray-500 truncate">{r.reason}</p>}
                <p className="text-[10px] text-gray-400">
                  {format(r.createdAt, 'MMM dd, h:mm a')}
                  {r.recordedBy ? ` · ${r.recordedBy.name}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
                className="ml-3 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                {deletingId === r.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
