'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateSystemSettings } from '@/actions/settings'
import { toast } from 'sonner'
import { Banknote, Settings2, ShieldCheck, Clock, DollarSign, CheckCircle2, Loader2 } from 'lucide-react'

type PayrollMode = 'ATTENDANCE' | 'FIXED'

export function SystemSettingsPanel({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings)
  const [denomLoading, setDenomLoading] = useState(false)
  const [payrollLoading, setPayrollLoading] = useState(false)

  const handleDenomToggle = async (checked: boolean) => {
    setDenomLoading(true)
    try {
      const updated = await updateSystemSettings({ enableDenominationCounting: checked })
      setSettings(updated)
      toast.success('Settings updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update settings')
    } finally {
      setDenomLoading(false)
    }
  }

  const handlePayrollModeChange = async (mode: PayrollMode) => {
    if (mode === settings.payrollMode) return
    setPayrollLoading(true)
    try {
      const updated = await updateSystemSettings({ payrollMode: mode })
      setSettings(updated)
      toast.success(
        mode === 'FIXED'
          ? 'Switched to Fixed Payroll — salaries will be paid in full regardless of attendance.'
          : 'Switched to Attendance-Based Payroll — salaries will reflect actual worked hours.',
        { duration: 5000 }
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to update payroll mode')
    } finally {
      setPayrollLoading(false)
    }
  }

  const currentMode: PayrollMode = settings.payrollMode ?? 'ATTENDANCE'

  return (
    <div className="space-y-6">
      {/* ── Cash Denomination Counting ── */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 rounded-2xl">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl">
              <Settings2 size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">System Configuration</CardTitle>
              <CardDescription className="text-xs">Manage global application features and behavior</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all hover:border-blue-200 dark:hover:border-blue-900/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Banknote size={20} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="denom-counting" className="text-sm font-bold cursor-pointer">Enable Cash Denomination Counting</Label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-sm">
                  When enabled, cashiers must enter the quantity of each bill and coin during shift closing.
                </p>
              </div>
            </div>
            <Switch
              id="denom-counting"
              checked={settings.enableDenominationCounting}
              onCheckedChange={handleDenomToggle}
              disabled={denomLoading}
            />
          </div>

          <div className="pt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <ShieldCheck size={14} className="text-blue-500" />
            <span>Only Administrators can modify these settings</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Payroll Mode ── */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 rounded-2xl">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-500/20 text-violet-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-black tracking-tight">Payroll Calculation Mode</CardTitle>
              <CardDescription className="text-xs">
                Controls how employee salaries are calculated during payroll settlement
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Attendance-Based Option */}
            <button
              onClick={() => handlePayrollModeChange('ATTENDANCE')}
              disabled={payrollLoading}
              className={`relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                currentMode === 'ATTENDANCE'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md shadow-blue-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-900'
              }`}
            >
              {currentMode === 'ATTENDANCE' && (
                <CheckCircle2 size={18} className="absolute top-4 right-4 text-blue-500" />
              )}
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">Attendance-Based</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Salary is calculated from actual worked hours, overtime, Friday hours, absences, and pro-ration for partial periods.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {['Pro-rated', 'OT Tracked', 'Absence Deductions', 'Attendance Required'].map(tag => (
                  <span key={tag} className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {tag}
                  </span>
                ))}
              </div>
            </button>

            {/* Fixed Option */}
            <button
              onClick={() => handlePayrollModeChange('FIXED')}
              disabled={payrollLoading}
              className={`relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                currentMode === 'FIXED'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md shadow-emerald-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-gray-900'
              }`}
            >
              {currentMode === 'FIXED' && (
                <CheckCircle2 size={18} className="absolute top-4 right-4 text-emerald-500" />
              )}
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">Fixed Payroll</p>
                <p className="text-xs text-gray-500 dark:text-gray:400 mt-1 leading-relaxed">
                  Salary is always paid in full as configured — no attendance tracking, no overtime, no pro-ration. Absence deductions still apply.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {['Full Salary', 'No OT', 'No Pro-ration', 'Absence Deductions Apply'].map(tag => (
                  <span key={tag} className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          </div>

          {payrollLoading && (
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              Saving payroll mode...
            </div>
          )}

          {/* Current mode banner */}
          <div className={`mt-4 flex items-center gap-3 p-3 rounded-xl border text-xs font-bold ${
            currentMode === 'FIXED'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400'
              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400'
          }`}>
            <ShieldCheck size={14} />
            {currentMode === 'FIXED'
              ? 'Active: Fixed Payroll — All employees receive their full configured salary regardless of attendance.'
              : 'Active: Attendance-Based Payroll — Salaries are calculated from actual worked hours and attendance records.'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
