'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { createSettlement } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'
import { useStore, Transaction } from '@/store/useStore'

import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

export function SettleCashBtn({ triggerClassName, children, open: externalOpen, onOpenChange: externalOnOpenChange, hideTrigger }: { 
  triggerClassName?: string, 
  children?: React.ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  hideTrigger?: boolean
}) {
  const { locale, t } = useLanguage();
  
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { transactions, cashInDrawer, isSettleCashOpen: storeOpen, setIsSettleCashOpen: setStoreOpen } = useStore()
  
  const isOpen = externalOpen !== undefined ? externalOpen : storeOpen
  const setIsOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setStoreOpen

  const [actualCount, setActualCount] = useState<string>('')

  const isRtl = locale === 'ar'

  const handleSettle = async () => {
    const count = parseFloat(actualCount)
    if (isNaN(count)) return;

    setLoading(true)
    try {
      const settlement = await createSettlement(count)
      
      if (settlement) {
        const blob = await pdf(<SettlementDocument settlement={settlement} transactions={settlement.transactions as any[]} locale={locale} />).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `settlement-${settlement.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      toast.success('Settlement Completed', {
        description: 'The drawer has been successfully settled and the balance is updated.',
      })
      
      // Update store for real-time dashboard sync
      const { setVaultData } = useStore.getState()
      setVaultData({
        cashInDrawer: 0, // Reset cash in drawer after settlement
        transactions: [], // Transactions are usually cleared or moved to history
        recentSettlements: [settlement, ...useStore.getState().recentSettlements]
      })

      setIsOpen(false)
    } catch (error) {
      console.error(error)
      toast.error('Settlement Failed', {
        description: 'An error occurred while settling the drawer. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const diff = parseFloat(actualCount || '0') - cashInDrawer

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} disablePointerDismissal>
      {triggerClassName !== 'hidden' && (
        <DialogTrigger 
          render={
            <Button 
              variant="secondary" 
              className={cn("bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-500/20 transition-all active:scale-95", triggerClassName)} 
              disabled={loading}
            />
          }
        >
          {children || t('settleCash')}
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-3xl"
      >
        <div className="p-8 sm:p-10 space-y-10">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('settleCash')}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm font-medium">
              {t('verifyPhysicalCash') || 'End of shift summary & reconciliation'}
            </DialogDescription>
          </DialogHeader>

          {/* iOS Summary Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('systemExpectedCash'), value: cashInDrawer, color: 'emerald' },
              { label: 'Network Sales', value: useStore.getState().networkSales || 0, color: 'blue' },
              { label: 'Tabby Balance', value: useStore.getState().tabbyBalance || 0, color: 'indigo' },
              { label: 'Tamara Balance', value: useStore.getState().tamaraBalance || 0, color: 'rose' }
            ].map((card) => (
              <div key={card.label} className="bg-white/50 dark:bg-gray-900/50 p-5 rounded-[1.5rem] border border-white/20 dark:border-gray-800/20 shadow-sm flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{card.label}</span>
                <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                  {card.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {/* Reconciliation Input Section */}
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-2">
              <Label htmlFor="actual-cash" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {t('physicallyCountedCash')}
              </Label>
              <div className="relative flex items-baseline justify-center w-full">
                <span className="text-xl font-bold text-gray-300 dark:text-gray-600 mr-2">SAR</span>
                <input
                  id="actual-cash"
                  type="number"
                  placeholder="0.00"
                  value={actualCount}
                  onChange={(e) => setActualCount(e.target.value)}
                  className="w-full text-center text-6xl font-black bg-transparent border-none focus:ring-0 placeholder:text-gray-200 dark:placeholder:text-gray-800 tabular-nums tracking-tighter outline-none"
                  autoFocus
                />
              </div>
            </div>

            {actualCount && (
              <div className={cn(
                'p-6 rounded-[2rem] border flex justify-between items-center animate-in slide-in-from-bottom-4 duration-500 shadow-sm transition-all',
                diff === 0 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' 
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-600'
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl', diff === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
                    {diff === 0 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {diff === 0 ? 'Perfect Reconciliation' : 'Variance Amount'}
                    </span>
                    <span className="text-2xl font-black tabular-nums tracking-tight">
                      {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs ml-1.5 opacity-60">SAR</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-[10px] text-center font-bold text-gray-400 px-8 leading-relaxed">
              <AlertCircle size={10} className="inline mr-1 mb-0.5" />
              This action will permanently reset the cash drawer and archive current records.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-full shadow-2xl shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                onClick={handleSettle}
                disabled={loading || !actualCount}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('confirmSettlement') || 'Confirm Settlement'}</span>
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-12 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
                onClick={() => setIsOpen(false)}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
