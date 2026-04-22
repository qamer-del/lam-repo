'use client'

import { useState } from 'react'
import { Landmark, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { settleAllSalaries } from '@/actions/transactions'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

export function SettleAllSalaries() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<'CASH' | 'NETWORK'>('CASH')
  const [done, setDone] = useState(false)

  const handleSettleAll = async () => {
    setLoading(true)
    try {
      const now = new Date()
      await settleAllSalaries({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        method
      })
      setDone(true)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Bulk settlement failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setDone(false); }}>
        <DialogTrigger render={<Button variant="outline" className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 shadow-md" />}>
          <Landmark size={16} />
          Settle All Salaries
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px]">
          {!done ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Landmark className="text-emerald-500" />
                  Bulk Salary Settlement
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-6 space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex gap-3 text-red-800 dark:text-red-400">
                  <AlertTriangle className="shrink-0" size={24} />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Important Notice</p>
                    <p className="text-xs leading-relaxed">
                      This action will calculate and finalize settlements for <strong>ALL active employees</strong>. 
                      All current advances will be cleared, and final payment transactions will be recorded in the register.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Finalizing Period</p>
                  <p className="text-2xl font-black text-center">{new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Payout Method for All</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="w-full py-6 rounded-2xl border-gray-100 dark:border-gray-800 focus:ring-emerald-500 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash Settlement (Drawer)</SelectItem>
                      <SelectItem value="NETWORK">Bank Transfer / Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSettleAll} className="w-full py-6 mt-4 bg-emerald-600 hover:bg-emerald-700 font-bold text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all rounded-2xl">
                  Confirm Bulk Settlement
                </Button>
              </div>
            </>
          ) : (
            <div className="py-10 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={48} className="animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black">All Done!</h3>
                <p className="text-sm text-gray-500">All employee balances have been successfully reset for the current month.</p>
              </div>
              
              <Button onClick={() => setOpen(false)} className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-gray-900 dark:bg-white dark:text-black hover:opacity-90">
                Return to Ledger
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
