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
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-[2rem]">
        <div className="bg-gradient-to-br from-gray-900 to-black p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <DialogHeader className="relative text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <Banknote size={24} className="text-emerald-400" />
            </div>
            <DialogTitle className="text-2xl font-black">{t('finalizeSettlement')}</DialogTitle>
            <DialogDescription className="text-gray-400 mt-2 leading-relaxed">
              {t('verifyPhysicalCash')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8 bg-white dark:bg-gray-950">
          <div className="flex flex-col gap-3 p-5 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-inner">
            <div className="flex items-center gap-2 text-gray-400">
              <Calculator size={14} />
              <Label className="text-[10px] uppercase font-black tracking-widest">{t('systemExpectedCash')}</Label>
            </div>
            <p className="text-4xl font-black text-gray-900 dark:text-white tabular-nums">
              {cashInDrawer.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="actual-cash" className="font-black text-xs uppercase tracking-widest text-gray-500">
                {t('physicallyCountedCash')}
              </Label>
              {actualCount && (
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${diff === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {diff === 0 ? 'Perfect Match' : 'Discrepancy Found'}
                </span>
              )}
            </div>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                <Banknote size={20} />
              </div>
              <Input
                id="actual-cash"
                type="number"
                placeholder="0.00"
                value={actualCount}
                onChange={(e) => setActualCount(e.target.value)}
                className="text-2xl font-black h-16 pl-12 bg-white dark:bg-black border-2 border-gray-100 dark:border-gray-800 focus:border-blue-500 rounded-2xl transition-all shadow-sm focus:shadow-xl focus:shadow-blue-500/10"
                autoFocus
              />
            </div>
          </div>

          {actualCount && (
            <div className={`p-5 rounded-3xl border-2 flex justify-between items-center animate-in zoom-in-95 duration-300 ${
              diff === 0 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                : 'bg-amber-50/50 border-amber-100 text-amber-700 dark:bg-amber-900/10 dark:border-amber-900/30'
            }`}>
              <div className="flex items-center gap-3">
                {diff === 0 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('discrepancy')}</span>
                  <span className="text-xl font-black tabular-nums">
                    {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 pt-0 bg-white dark:bg-gray-950">
          <Button 
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            onClick={handleSettle}
            disabled={loading || !actualCount}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                {t('confirmHandover')}
                <CheckCircle2 size={20} />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
