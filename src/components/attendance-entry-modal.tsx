'use client'

import { useState } from 'react'
import { Clock, Plus, Loader2, Calendar, Sun, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { addAttendanceRecord } from '@/actions/payroll'
import { isFridayDate } from '@/lib/payroll-engine'

interface AttendanceEntryModalProps {
  staffId: number
  staffName: string
  onAdded?: () => void
  defaultDate?: string
}

export function AttendanceEntryModal({
  staffId,
  staffName,
  onAdded,
  defaultDate,
}: AttendanceEntryModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(defaultDate || today)
  const [clockIn, setClockIn] = useState('08:00')
  const [clockOut, setClockOut] = useState('20:00')
  const [note, setNote] = useState('')

  const dateObj = date ? new Date(date + 'T00:00:00') : null
  const friday = dateObj ? isFridayDate(dateObj) : false

  // Calculate preview hours
  let workedHoursPreview = 0
  if (clockIn && clockOut) {
    const [inH, inM] = clockIn.split(':').map(Number)
    const [outH, outM] = clockOut.split(':').map(Number)
    const inMins = inH * 60 + inM
    const outMins = outH * 60 + outM
    workedHoursPreview = Math.max(0, (outMins - inMins) / 60)
  }

  const officialHours = friday ? 0 : Math.min(workedHoursPreview, 8)
  const overtimeHours = friday ? 0 : Math.max(0, workedHoursPreview - 8)
  const fridayHours = friday ? workedHoursPreview : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)
    try {
      await addAttendanceRecord({ staffId, date, clockIn, clockOut, note: note || undefined })
      toast.success('Attendance Recorded', {
        description: `${date} — ${workedHoursPreview.toFixed(1)} hrs worked${friday ? ' (Friday OT)' : ''}`,
      })
      setOpen(false)
      setNote('')
      onAdded?.()
    } catch (err: any) {
      toast.error('Failed', { description: err.message || 'Could not save attendance record.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20" />
      }>
        <Plus size={15} />
        Log Attendance
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] rounded-3xl p-0 border-none bg-white dark:bg-gray-950 shadow-2xl">
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Clock size={18} />
              </div>
              Log Attendance
            </DialogTitle>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {staffName} — Enter clock-in and clock-out times
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type="date"
                  required
                  max={today}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="h-11 pl-10 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                />
              </div>
              {friday && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <Sun size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Friday — All worked hours will count as full overtime
                  </p>
                </div>
              )}
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Clock In
                </Label>
                <Input
                  type="time"
                  required
                  value={clockIn}
                  onChange={e => setClockIn(e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Clock Out
                </Label>
                <Input
                  type="time"
                  required
                  value={clockOut}
                  onChange={e => setClockOut(e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 font-mono"
                />
              </div>
            </div>

            {/* Hours breakdown preview */}
            {workedHoursPreview > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                  Hours Preview
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Total Worked</span>
                  <span className="font-black text-gray-900 dark:text-white">
                    {workedHoursPreview.toFixed(1)} hrs
                  </span>
                </div>
                {!friday && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Official Hours (≤8h)</span>
                      <span className="font-bold text-blue-600">{officialHours.toFixed(1)} hrs</span>
                    </div>
                    {overtimeHours > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Overtime Hours (&gt;8h)</span>
                        <span className="font-bold text-orange-600">{overtimeHours.toFixed(1)} hrs</span>
                      </div>
                    )}
                  </>
                )}
                {friday && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-600 font-bold">Friday Overtime</span>
                    <span className="font-black text-amber-600">{fridayHours.toFixed(1)} hrs</span>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Note (optional)
              </Label>
              <Input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Extended shift, project delivery..."
                className="h-11 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || workedHoursPreview <= 0}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock size={18} />}
              Save Attendance Record
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
