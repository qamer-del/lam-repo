'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { createSettlement } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'
import { useStore } from '@/store/useStore'

import { cn } from '@/lib/utils'

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, CheckCircle2, AlertCircle, Banknote } from 'lucide-react'

export function SettleCashBtn({ triggerClassName }: { triggerClassName?: string }) {
  const { t, locale } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [actualCount, setActualCount] = useState<string>('')
  const { transactions, cashInDrawer } = useStore()

  const isRtl = locale === 'ar'

  const handleSettle = async () => {
    const count = parseFloat(actualCount)
    if (isNaN(count)) return;

    setLoading(true)
    try {
      const settlement = await createSettlement(count)
      
      if (settlement) {
        const blob = await pdf(<SettlementDocument settlement={settlement} transactions={settlement.transactions as any[]} />).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `settlement-${settlement.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const diff = parseFloat(actualCount || '0') - cashInDrawer

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button 
            variant="secondary" 
            className={cn("bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-500/20 transition-all active:scale-95", triggerClassName)} 
            disabled={loading}
          />
        }
      >
        {t('settleCash')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white dark:bg-gray-950">
        <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-24 -mb-24 blur-3xl" />
          
          <DialogHeader className="relative text-left">
            <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <Banknote size={32} className="text-emerald-400" strokeWidth={2.5} />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight">{t('finalizeSettlement')}</DialogTitle>
            <DialogDescription className="text-gray-400 mt-3 text-base leading-relaxed">
              {t('verifyPhysicalCash')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-10 space-y-10">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900/50 dark:to-gray-900/20 rounded-[2.5rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calculator size={14} strokeWidth={3} />
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em]">{t('systemExpectedCash')}</Label>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">System Record</span>
              </div>
              <p className="text-6xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                {cashInDrawer.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xl ml-3 text-gray-300 dark:text-gray-700 italic font-medium tracking-normal">SAR</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <Label htmlFor="actual-cash" className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">
                {t('physicallyCountedCash')}
              </Label>
              {actualCount && (
                <div className={cn(
                  'text-[9px] font-black uppercase px-3 py-1 rounded-full animate-in fade-in zoom-in-90',
                  diff === 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                )}>
                  {diff === 0 ? 'Perfect Reconciliation' : 'Discrepancy Detected'}
                </div>
              )}
            </div>
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-all">
                <Banknote size={24} strokeWidth={2.5} />
              </div>
              <Input
                id="actual-cash"
                type="number"
                placeholder="Enter actual amount..."
                value={actualCount}
                onChange={(e) => setActualCount(e.target.value)}
                className="text-3xl font-black h-20 pl-16 rounded-[1.5rem] bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-500 transition-all shadow-inner focus:shadow-2xl focus:shadow-blue-500/10"
                autoFocus
              />
            </div>
          </div>

          {actualCount && (
            <div className={cn(
              'p-6 rounded-[2rem] border-2 flex justify-between items-center animate-in slide-in-from-bottom-4 duration-500',
              diff === 0 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' 
                : 'bg-amber-500/5 border-amber-500/20 text-amber-600'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl', diff === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
                  {diff === 0 ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Variance Amount</span>
                  <span className="text-2xl font-black tabular-nums tracking-tight">
                    {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <span className="text-xs ml-1.5 opacity-60">SAR</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button 
            className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-[1.5rem] shadow-2xl shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
            onClick={handleSettle}
            disabled={loading || !actualCount}
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <span>{t('confirmHandover')}</span>
                <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
