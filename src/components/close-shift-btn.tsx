'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { createCashierHandover } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, CheckCircle2, AlertCircle, Banknote, History } from 'lucide-react'

export function CloseShiftBtn({ 
  triggerClassName,
  cashTotal,
  networkTotal,
  tabbyTotal,
  tamaraTotal
}: { 
  triggerClassName?: string 
  cashTotal: number
  networkTotal: number
  tabbyTotal: number
  tamaraTotal: number
}) {
  const { t, locale } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [actualCount, setActualCount] = useState<string>('')

  const handleCloseShift = async () => {
    const count = parseFloat(actualCount)
    if (isNaN(count)) return;

    setLoading(true)
    try {
      const settlement = await createCashierHandover(count)
      
      if (settlement) {
        const blob = await pdf(<SettlementDocument settlement={settlement} transactions={settlement.transactions as any[]} locale={locale} />).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shift-handover-${settlement.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      toast.success('Shift Closed', {
        description: 'Your shift has been successfully closed and recorded.',
      })

      // Server revalidation via revalidatePath handles the UI update.
      // The cashier's query filters settlementId: null, so handover'd
      // transactions naturally disappear from their view on refresh.

      setIsOpen(false)
    } catch (error) {
      console.error(error)
      toast.error('Closure Failed', {
        description: 'An error occurred while closing the shift. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const diff = parseFloat(actualCount || '0') - cashTotal

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button 
            variant="outline" 
            className={cn("h-9 px-4 text-sm gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400", triggerClassName)} 
            disabled={loading}
          />
        }
      >
        <History size={14} />
        {t('closeMyShift')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white dark:bg-gray-950">
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <DialogHeader className="relative text-left">
            <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <Banknote size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight">{t('shiftHandover')}</DialogTitle>
            <DialogDescription className="text-emerald-100 mt-3 text-base leading-relaxed">
              {t('handoverToManagerNote')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-1">{t('cashSales')}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{cashTotal.toFixed(2)} <span className="text-[10px] font-normal">SAR</span></p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-1">{t('networkSales')}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{networkTotal.toFixed(2)} <span className="text-[10px] font-normal">SAR</span></p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] uppercase font-black text-purple-400 tracking-wider mb-1">Tabby Sales</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{tabbyTotal.toFixed(2)} <span className="text-[10px] font-normal">SAR</span></p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] uppercase font-black text-pink-400 tracking-wider mb-1">Tamara Sales</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{tamaraTotal.toFixed(2)} <span className="text-[10px] font-normal">SAR</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <Label htmlFor="actual-cash" className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">
                {t('physicallyHandedCash')}
              </Label>
              {actualCount && (
                <div className={cn(
                  'text-[9px] font-black uppercase px-3 py-1 rounded-full',
                  diff === 0 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                )}>
                  {diff === 0 ? 'Exact Match' : 'Discrepancy'}
                </div>
              )}
            </div>
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-all">
                <Banknote size={24} strokeWidth={2.5} />
              </div>
              <Input
                id="actual-cash"
                type="number"
                placeholder="Enter amount handed..."
                value={actualCount}
                onChange={(e) => setActualCount(e.target.value)}
                className="text-3xl font-black h-20 pl-16 rounded-[1.5rem] bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:bg-white dark:focus:bg-black focus:border-emerald-500 transition-all shadow-inner"
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
            className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
            onClick={handleCloseShift}
            disabled={loading || !actualCount}
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
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
