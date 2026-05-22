'use client'

import { useState, useMemo } from 'react'
import {
  SlidersHorizontal,
  Package,
  Minus,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Equal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/providers/language-provider'
import { adjustStock } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'
import { toast } from 'sonner'
import { useStore } from '@/store/useStore'
import { getDashboardData } from '@/actions/transactions'
import { cn } from '@/lib/utils'

interface Props {
  item: {
    id: number
    name: string
    currentStock: number
    unit: string
    sku?: string | null
  }
  onClose: () => void
}

const COUNT_REASONS = [
  { key: 'physical', labelKey: 'reasonPhysicalCount' as const },
  { key: 'damage', labelKey: 'reasonDamage' as const },
  { key: 'found', labelKey: 'reasonFound' as const },
  { key: 'correction', labelKey: 'reasonCorrection' as const },
] as const

function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function StockAdjustmentModal({ item, onClose }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [countedInput, setCountedInput] = useState('')
  const [note, setNote] = useState('')
  const [reasonKey, setReasonKey] = useState<string>('physical')

  const current = item.currentStock
  const countedParsed = countedInput.trim() === '' ? null : parseFloat(countedInput)
  const countedValid =
    countedParsed !== null && !Number.isNaN(countedParsed) && countedParsed >= 0

  const difference = countedValid ? countedParsed - current : null
  const newStock = countedValid ? countedParsed : null

  const differenceLabel = useMemo(() => {
    if (difference === null) return '—'
    if (difference === 0) return '0'
    return difference > 0 ? `+${formatQty(difference)}` : formatQty(difference)
  }, [difference])

  const stepCounted = (delta: number) => {
    const base = countedValid ? countedParsed! : current
    const next = Math.max(0, base + delta)
    setCountedInput(String(next))
  }

  const syncToSystemStock = () => {
    setCountedInput(formatQty(current))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!countedValid || difference === null) {
      toast.warning('Counted quantity required', {
        description: 'Enter the quantity from your physical count.',
      })
      return
    }
    if (difference === 0) {
      toast.info(t('noStockChange'))
      return
    }

    setLoading(true)
    try {
      const reasonLabel = t(COUNT_REASONS.find((r) => r.key === reasonKey)?.labelKey ?? 'reasonPhysicalCount')
      const autoNote = `Count adjustment: ${formatQty(current)} → ${formatQty(countedParsed!)} ${item.unit} (${difference > 0 ? '+' : ''}${formatQty(difference)}). ${reasonLabel}.`
      await adjustStock({
        itemId: item.id,
        quantity: difference,
        note: note.trim() || autoNote,
      })

      toast.success('Stock Adjusted', {
        description: `"${item.name}" updated to ${formatQty(countedParsed!)} ${item.unit} (${difference > 0 ? '+' : ''}${formatQty(difference)}).`,
      })

      const data = await getDashboardData()
      useStore.getState().setVaultData({
        transactions: data.transactions,
        cashInDrawer: data.cashInDrawer,
        networkSales: data.networkSales,
        salaryFundRemaining: data.salaryFundRemaining,
        totalOutstandingCredit: data.totalOutstandingCredit,
      })

      router.refresh()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Adjustment Failed', {
        description: 'An error occurred while updating the stock level.',
      })
    } finally {
      setLoading(false)
    }
  }

  const diffTone =
    difference === null || difference === 0
      ? 'neutral'
      : difference > 0
        ? 'up'
        : 'down'

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent
          className={cn(
            'w-full max-w-none p-0 border-none shadow-2xl overflow-hidden font-sans',
            'fixed inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 rounded-t-[1.75rem] rounded-b-none',
            'h-auto max-h-[min(100dvh,720px)]',
            'sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:max-w-[440px] sm:rounded-2xl sm:max-h-[90vh]'
          )}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shrink-0" />

          <div className="flex flex-col max-h-[min(100dvh,720px)] sm:max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <DialogHeader className="text-left space-y-2">
                <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                    <SlidersHorizontal size={20} />
                  </div>
                  {t('stockCountAdjustment')}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                  {t('stockCountSubtitle')}
                </DialogDescription>
                <div className="flex items-center gap-2 pt-1 min-w-0">
                  <Package size={14} className="text-amber-600 shrink-0" />
                  <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.name}</span>
                  {item.sku && (
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">{item.sku}</span>
                  )}
                </div>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 p-3 sm:p-4 text-center">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                      {t('currentStockLabel')}
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                      {formatQty(current)}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.unit}</p>
                  </div>

                  <div className="rounded-2xl border-2 border-amber-400/60 dark:border-amber-600/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-4 text-center ring-2 ring-amber-500/10">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                      {t('countedStockLabel')}
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums min-h-[2rem] flex items-center justify-center">
                      {countedValid ? formatQty(countedParsed!) : '—'}
                    </p>
                    <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 mt-0.5">{item.unit}</p>
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl border p-3 sm:p-4 text-center transition-colors',
                      diffTone === 'up' && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30',
                      diffTone === 'down' && 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/30',
                      diffTone === 'neutral' && 'border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50'
                    )}
                  >
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-center gap-0.5">
                      {t('differenceLabel')}
                      {diffTone === 'up' && <TrendingUp size={10} className="text-emerald-600" />}
                      {diffTone === 'down' && <TrendingDown size={10} className="text-red-600" />}
                      {diffTone === 'neutral' && countedValid && <Equal size={10} className="text-gray-400" />}
                    </p>
                    <p
                      className={cn(
                        'text-xl sm:text-2xl font-black tabular-nums',
                        diffTone === 'up' && 'text-emerald-600 dark:text-emerald-400',
                        diffTone === 'down' && 'text-red-600 dark:text-red-400',
                        diffTone === 'neutral' && 'text-gray-500'
                      )}
                    >
                      {differenceLabel}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.unit}</p>
                  </div>
                </div>

                {/* Counted input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {t('countedStockLabel')}
                    </Label>
                    <button
                      type="button"
                      onClick={syncToSystemStock}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 uppercase tracking-wide"
                    >
                      {t('useSystemQty')}
                    </button>
                  </div>

                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => stepCounted(-1)}
                      className="h-14 w-12 shrink-0 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition active:scale-95"
                      aria-label="Decrease count"
                    >
                      <Minus size={20} />
                    </button>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      required
                      inputMode="decimal"
                      placeholder={formatQty(current)}
                      value={countedInput}
                      onChange={(e) => setCountedInput(e.target.value)}
                      className="h-14 flex-1 min-w-0 text-center text-2xl sm:text-3xl font-black rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 focus:border-amber-500 focus:ring-amber-500/20 tabular-nums"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => stepCounted(1)}
                      className="h-14 w-12 shrink-0 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition active:scale-95"
                      aria-label="Increase count"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {countedValid && newStock !== null && (
                    <div
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold',
                        difference === 0
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                      )}
                    >
                      <span className="tabular-nums">{formatQty(current)}</span>
                      <ArrowRight size={14} className="shrink-0 opacity-60" />
                      <span className="tabular-nums font-black">{formatQty(newStock)}</span>
                      <span className="text-gray-500 font-medium">({t('stockAfterCount')})</span>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Reason
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {COUNT_REASONS.map(({ key, labelKey }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setReasonKey(key)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-bold transition-all border-2',
                          reasonKey === key
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                            : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        )}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t('adjustmentNote')} <span className="font-medium normal-case text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. Monthly shelf count — aisle 3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 safe-area-bottom bg-white dark:bg-gray-950 space-y-2">
                {countedValid && difference === 0 && (
                  <p className="text-xs font-semibold text-center text-gray-500">{t('noStockChange')}</p>
                )}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="h-12 rounded-2xl font-bold w-full sm:flex-1"
                  >
                    {t('cancel') || 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !countedValid || difference === null || difference === 0}
                    className="h-12 w-full sm:flex-[2] font-black uppercase tracking-wide text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('processing')}
                      </div>
                    ) : (
                      t('applyAdjustment')
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
