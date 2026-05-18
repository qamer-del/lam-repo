'use client'

import { useState } from 'react'
import { Clock, Trash2, Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { addAbsenceRecord, deleteAbsenceRecord } from '@/actions/staff'
import { toast } from 'sonner'
import { format } from 'date-fns'

type AbsenceRecord = {
  id: number
  hours: number
  reason: string | null
  createdAt: Date
  recordedBy?: { name: string } | null
}

interface AbsenceRecordModalProps {
  staffId: number
  staffName: string
  hourlyRate: number
  month: number
  year: number
  existingRecords: AbsenceRecord[]
  onRefresh?: () => void
}

export function AbsenceRecordModal({
  staffId,
  staffName,
  hourlyRate,
  month,
  year,
  existingRecords,
  onRefresh,
}: AbsenceRecordModalProps) {
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const previewDeduction = hours ? parseFloat(hours) * hourlyRate : 0
  const totalAbsenceHours = existingRecords.reduce((s, r) => s + r.hours, 0)
  const totalAbsenceDeduction = totalAbsenceHours * hourlyRate

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy')

  const handleAdd = async () => {
    const h = parseFloat(hours)
    if (!h || h <= 0) return toast.error('Enter valid absence hours')
    setLoading(true)
    try {
      await addAbsenceRecord({ staffId, month, year, hours: h, reason: reason || undefined })
      toast.success(`Recorded ${h}h absence — deduction: ${previewDeduction.toFixed(2)} SAR`)
      setHours('')
      setReason('')
      onRefresh?.()
    } catch (e: any) {
      toast.error(e.message || 'Failed to record absence')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await deleteAbsenceRecord(id)
      toast.success('Absence record removed')
      onRefresh?.()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        />
      }>
        <Clock size={14} />
        Record Absence
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto font-cairo">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Clock size={18} />
            Absence Hours — {staffName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Month context */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Period</span>
            <span className="text-sm font-black text-gray-800 dark:text-white">{monthName}</span>
          </div>

          {/* Summary */}
          {existingRecords.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-red-500 uppercase tracking-wider">Total Absent Hours</span>
                <span className="font-black text-red-700 dark:text-red-400">{totalAbsenceHours.toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-red-500 uppercase tracking-wider">Total Deduction</span>
                <span className="font-black text-red-700 dark:text-red-400">{totalAbsenceDeduction.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between text-[10px] pt-1 border-t border-red-200/50 dark:border-red-800/50">
                <span className="text-red-400">Hourly Rate</span>
                <span className="text-red-500 font-bold">{hourlyRate.toFixed(2)} SAR/hr</span>
              </div>
            </div>
          )}

          {/* Add new record */}
          <div className="space-y-3 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Add New Entry</p>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Absence Hours</Label>
              <div className="relative">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {hours && parseFloat(hours) > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500">
                    − {previewDeduction.toFixed(2)} SAR
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Reason (optional)</Label>
              <input
                type="text"
                placeholder="e.g. Sick leave, personal"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={loading || !hours || parseFloat(hours) <= 0}
              className="w-full bg-red-600 hover:bg-red-700 gap-2 shadow-lg shadow-red-500/20"
            >
              <Plus size={16} />
              {loading ? 'Saving...' : 'Add Absence Record'}
            </Button>
          </div>

          {/* Existing records */}
          {existingRecords.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">This Month's Records</p>
              {existingRecords.map(record => (
                <div
                  key={record.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-red-600">{record.hours} hrs</span>
                      <span className="text-xs text-gray-400">= {(record.hours * hourlyRate).toFixed(2)} SAR</span>
                    </div>
                    {record.reason && (
                      <p className="text-xs text-gray-500 truncate">{record.reason}</p>
                    )}
                    <p className="text-[10px] text-gray-400">{format(new Date(record.createdAt), 'MMM dd, hh:mm a')}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(record.id)}
                    disabled={deleting === record.id}
                    className="ml-3 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {existingRecords.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              No absence records this month.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
