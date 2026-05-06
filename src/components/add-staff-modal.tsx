'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
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
import { useLanguage } from '@/providers/language-provider'
import { addStaff } from '@/actions/staff'
import { toast } from 'sonner'
import { useStore } from '@/store/useStore'
import { getDashboardData } from '@/actions/transactions'
import { getStaffList } from '@/actions/staff'

export function AddStaffModal({ onAdded }: { onAdded?: () => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [salary, setSalary] = useState('')
  const [housing, setHousing] = useState('')
  const [transport, setTransport] = useState('')
  const [other, setOther] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [nationality, setNationality] = useState('')

  const baseSal = parseFloat(salary) || 0
  const houseAllow = parseFloat(housing) || 0
  const transAllow = parseFloat(transport) || 0
  const otherAllow = parseFloat(other) || 0
  const totalSalary = baseSal + houseAllow + transAllow + otherAllow

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addStaff({ 
        name, 
        baseSalary: baseSal,
        housingAllowance: houseAllow,
        transportAllowance: transAllow,
        otherAllowance: otherAllow,
        idNumber,
        nationality
      })
      toast.success('Staff Added', {
        description: `Successfully added ${name} to the system with a total salary of ${totalSalary} SAR.`,
      })
      setOpen(false)
      setName('')
      setSalary('')
      setHousing('')
      setTransport('')
      setOther('')
      setIdNumber('')
      setNationality('')
      
      // Update store for real-time ledger sync
      const [staffData, txData] = await Promise.all([
        getStaffList(),
        getDashboardData()
      ])
      useStore.getState().setVaultData({
        transactions: txData.transactions,
      })

      onAdded?.()
    } catch (err) {
      console.error(err)
      toast.error('Operation Failed', {
        description: 'Could not add staff member. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="flex w-full sm:w-auto items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm h-10 px-4" />}>
        <UserPlus size={16} />
        Add Staff
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto font-sans p-0 border-none shadow-3xl rounded-[24px] bg-gray-50 dark:bg-gray-950">
        <div className="p-6 sm:p-8 space-y-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Add Staff Member
            </DialogTitle>
            <p className="text-sm font-medium text-gray-500">Register a new employee and define their salary breakdown.</p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="staffName" className="text-[11px] font-black uppercase tracking-wider text-gray-500">Full Name</Label>
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
                  <Label htmlFor="idNumber" className="text-[11px] font-black uppercase tracking-wider text-gray-500">ID / Iqama</Label>
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
                  <Label htmlFor="nationality" className="text-[11px] font-black uppercase tracking-wider text-gray-500">Nationality</Label>
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

              <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-4 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-2">Salary & Allowances</h4>
                <div className="grid gap-1.5">
                  <Label htmlFor="baseSalary" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Base Salary (SAR)</Label>
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
                    <Label htmlFor="housing" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Housing</Label>
                    <Input
                      id="housing"
                      type="number"
                      step="0.01"
                      value={housing}
                      onChange={(e) => setHousing(e.target.value)}
                      className="h-10 rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 tabular-nums text-xs"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="transport" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Transport</Label>
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
                    <Label htmlFor="other" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Other</Label>
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

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">Total Salary</span>
                  <span className="text-lg font-black text-emerald-600 tabular-nums">
                    {totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] text-gray-400">SAR</span>
                  </span>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Staff Member'
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
