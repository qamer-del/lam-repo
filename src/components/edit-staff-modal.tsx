'use client'

import { useState, useEffect } from 'react'
import { Edit2, Loader2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/providers/language-provider'
import { updateStaff } from '@/actions/staff'
import { toast } from 'sonner'
import { useStore } from '@/store/useStore'
import { getDashboardData } from '@/actions/transactions'
import { getStaffList } from '@/actions/staff'
import { getUsers } from '@/actions/users'

interface EditStaffModalProps {
  staff: {
    id: number
    name: string
    baseSalary: number
    safetyAllowance?: number
    overtimeAllowance?: number
    transportAllowance?: number
    otherAllowance?: number
    overtimeMultiplier?: number
    monthlyHours?: number
    idNumber?: string
    nationality?: string
    userId?: string | null
    payrollStrategy?: string
    targetSalary?: number
    useAttendance?: boolean
    officialDailyHours?: number
  }
  onUpdated?: () => void
}

export function EditStaffModal({ staff, onUpdated }: EditStaffModalProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(staff.name)
  const [salary, setSalary] = useState(staff.baseSalary.toString())
  const [safety, setSafety] = useState((staff.safetyAllowance || 0).toString())
  const [overtime, setOvertime] = useState((staff.overtimeAllowance || 0).toString())
  const [transport, setTransport] = useState((staff.transportAllowance || 0).toString())
  const [other, setOther] = useState((staff.otherAllowance || 0).toString())
  const [overtimeMult, setOvertimeMult] = useState((staff.overtimeMultiplier || 1.5).toString())
  const [monthlyHoursInput, setMonthlyHoursInput] = useState((staff.monthlyHours || 208).toString())
  const [idNumber, setIdNumber] = useState(staff.idNumber || '')
  const [nationality, setNationality] = useState(staff.nationality || '')
  const [userId, setUserId] = useState<string>(staff.userId || 'none')
  const [users, setUsers] = useState<{id: string, name: string, role: string}[]>([])
  // Payroll config
  const [payrollStrategy, setPayrollStrategy] = useState(staff.payrollStrategy || 'STANDARD')
  const [targetSalary, setTargetSalary] = useState((staff.targetSalary || 0).toString())
  const [useAttendance, setUseAttendance] = useState(staff.useAttendance !== undefined ? staff.useAttendance : true)
  const [officialDailyHours, setOfficialDailyHours] = useState((staff.officialDailyHours || 8).toString())

  useEffect(() => {
    if (open) {
      setName(staff.name)
      setSalary(staff.baseSalary.toString())
      setSafety((staff.safetyAllowance || 0).toString())
      setOvertime((staff.overtimeAllowance || 0).toString())
      setTransport((staff.transportAllowance || 0).toString())
      setOther((staff.otherAllowance || 0).toString())
      setOvertimeMult((staff.overtimeMultiplier || 1.5).toString())
      setMonthlyHoursInput((staff.monthlyHours || 208).toString())
      setIdNumber(staff.idNumber || '')
      setNationality(staff.nationality || '')
      setUserId(staff.userId || 'none')
      setPayrollStrategy(staff.payrollStrategy || 'STANDARD')
      setTargetSalary((staff.targetSalary || 0).toString())
      setUseAttendance(staff.useAttendance !== undefined ? staff.useAttendance : true)
      setOfficialDailyHours((staff.officialDailyHours || 8).toString())
      getUsers().then(setUsers).catch(console.error)
    }
  }, [open, staff])

  const baseSal = parseFloat(salary) || 0
  const safetyAllow = parseFloat(safety) || 0
  const overtimeAllow = parseFloat(overtime) || 0
  const transAllow = parseFloat(transport) || 0
  const otherAllow = parseFloat(other) || 0
  const totalSalary = baseSal + safetyAllow + overtimeAllow + transAllow + otherAllow

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateStaff(staff.id, { 
        name, 
        baseSalary: baseSal,
        safetyAllowance: safetyAllow,
        overtimeAllowance: overtimeAllow,
        transportAllowance: transAllow,
        otherAllowance: otherAllow,
        overtimeMultiplier: parseFloat(overtimeMult) || 1.5,
        monthlyHours: parseFloat(monthlyHoursInput) || 208,
        idNumber,
        nationality,
        userId: userId === 'none' ? undefined : userId,
        payrollStrategy,
        targetSalary: parseFloat(targetSalary) || 0,
        useAttendance,
        officialDailyHours: parseFloat(officialDailyHours) || 8,
      })
      toast.success(t('staffUpdatedSuccess') || 'Staff Updated', {
        description: `Successfully updated ${name}.`,
      })
      setOpen(false)
      
      // Update store for real-time ledger sync
      const [staffData, txData] = await Promise.all([
        getStaffList(),
        getDashboardData()
      ])
      useStore.getState().setVaultData({
        transactions: txData.transactions,
      })

      onUpdated?.()
    } catch (err) {
      console.error(err)
      toast.error(t('operationFailed'), {
        description: t('updateStaffFailedDesc') || 'Failed to update employee information.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95 shadow-sm border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-gray-900">
          <Edit2 size={16} />
        </button>
      } />
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto font-sans p-0 border-none shadow-3xl rounded-[24px] bg-gray-50 dark:bg-gray-950">
        <div className="p-6 sm:p-8 space-y-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('editStaffMember') || 'Edit Staff Member'}
            </DialogTitle>
            <p className="text-sm font-medium text-gray-500">{t('updateEmployeeInfo') || 'Update employee records and salary breakdown.'}</p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="staffName" className="text-[11px] font-black uppercase tracking-wider text-gray-500">{t('staffName') || 'Full Name'}</Label>
                <Input
                  id="staffName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="idNumber" className="text-[11px] font-black uppercase tracking-wider text-gray-500">{t('idIqama') || 'ID / Iqama'}</Label>
                  <Input
                    id="idNumber"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="h-11 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    placeholder="Enter ID"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nationality" className="text-[11px] font-black uppercase tracking-wider text-gray-500">{t('nationalityLabel') || 'Nationality'}</Label>
                  <Input
                    id="nationality"
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="h-11 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    placeholder="e.g. Saudi"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="linkedUser" className="text-[11px] font-black uppercase tracking-wider text-gray-500">Link System User (For Credit Tracking)</Label>
                <Select value={userId} onValueChange={(v) => setUserId(v || 'none')}>
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <SelectValue placeholder="Select a user account to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked user</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-4 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-2">{t('salaryAndAllowances') || 'Salary & Allowances'}</h4>
                <div className="grid gap-1.5">
                  <Label htmlFor="baseSalary" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('baseSalarySar') || 'Base Salary (SAR)'}</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    step="0.01"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="overtime" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('overtime') || 'Overtime'}</Label>
                    <Input
                      id="overtime"
                      type="number"
                      step="0.01"
                      value={overtime}
                      onChange={(e) => setOvertime(e.target.value)}
                      className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums text-xs"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="transport" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('transport') || 'Transport'}</Label>
                    <Input
                      id="transport"
                      type="number"
                      step="0.01"
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums text-xs"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="other" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('otherAllowance') || 'Other'}</Label>
                    <Input
                      id="other"
                      type="number"
                      step="0.01"
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                      className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums text-xs"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor={`monthlyHours-${staff.id}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Monthly Working Hours</Label>
                  <Input
                    id={`monthlyHours-${staff.id}`}
                    type="number"
                    step="1"
                    min="1"
                    value={monthlyHoursInput}
                    onChange={(e) => setMonthlyHoursInput(e.target.value)}
                    className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums"
                    placeholder="208"
                  />
                  <p className="text-[10px] text-gray-400">Used to calculate hourly rate for absence deductions. Default: 208 hrs (8h × 26 days)</p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">{t('totalSalary') || 'Total Salary'}</span>
                  <span className="text-lg font-black text-emerald-600 tabular-nums">
                    {totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-gray-400">SAR</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ── Payroll Configuration ── */}
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-2">Payroll Configuration</h4>

              {/* Payroll Strategy */}
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payroll Strategy</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([{ val: 'STANDARD', label: 'Standard', desc: 'Attendance-based with OT' }, { val: 'TARGET_SALARY', label: 'Target Salary', desc: 'Fixed target top-up' }] as const).map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setPayrollStrategy(opt.val)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        payrollStrategy === opt.val
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-black text-gray-900 dark:text-white">{opt.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Salary — only when strategy = TARGET_SALARY */}
              {payrollStrategy === 'TARGET_SALARY' && (
                <div className="grid gap-1.5">
                  <Label htmlFor="targetSalary" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Target Salary (SAR) <span className="text-blue-500">— guaranteed monthly total</span>
                  </Label>
                  <Input
                    id="targetSalary"
                    type="number" step="0.01" min="0"
                    value={targetSalary}
                    onChange={e => setTargetSalary(e.target.value)}
                    className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums"
                    placeholder="e.g. 2500.00"
                  />
                  <p className="text-[10px] text-gray-400">
                    System will top up to this amount. Adjustment = Target − Base − Safety Allowance.
                  </p>
                </div>
              )}

              {/* Use Attendance */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Use Attendance for Payroll</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">If off, employee receives fixed salary regardless of attendance</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseAttendance(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    useAttendance ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    useAttendance ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Official Daily Hours */}
              <div className="grid gap-1.5">
                <Label htmlFor={`officialHours-${staff.id}`} className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Official Daily Hours</Label>
                <Input
                  id={`officialHours-${staff.id}`}
                  type="number" step="0.5" min="1" max="24"
                  value={officialDailyHours}
                  onChange={e => setOfficialDailyHours(e.target.value)}
                  className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums"
                  placeholder="8"
                />
                <p className="text-[10px] text-gray-400">Hours per day before overtime kicks in. Default: 8h.</p>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t('saveChanges') || 'Save Changes'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
