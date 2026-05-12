'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { getShiftSummary, closeShift } from '@/actions/transactions'
import { getSystemSettings } from '@/actions/settings'
import { pdf } from '@react-pdf/renderer'
import { ShiftReportDocument } from './shift-report-document'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  Banknote, 
  History, 
  ArrowRight, 
  ArrowLeft, 
  Printer, 
  Download,
  CreditCard,
  Wallet,
  Receipt,
  User,
  Clock
} from 'lucide-react'

const DENOMINATIONS = [
  { label: '200 SAR', value: 200, key: '200' },
  { label: '100 SAR', value: 100, key: '100' },
  { label: '50 SAR', value: 50, key: '50' },
  { label: '20 SAR', value: 20, key: '20' },
  { label: '10 SAR', value: 10, key: '10' },
  { label: '5 SAR', value: 5, key: '5' },
  { label: '1 SAR', value: 1, key: '1' },
  { label: '0.5 SAR', value: 0.5, key: '0.5' },
]

type Step = 'REVIEW' | 'COUNT' | 'CONFIRM' | 'FINISH'

export function ShiftClosingWorkflow({ 
  open, 
  onOpenChange 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const { locale, t } = useLanguage()
  const { activeShift, setVaultData } = useStore()
  const router = useRouter()
  
  const [step, setStep] = useState<Step>('REVIEW')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  
  // Cash Counting State
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [coins, setCoins] = useState<string>('')
  
  const [closedShiftResult, setClosedShiftResult] = useState<any>(null)
  const [systemSettings, setSystemSettings] = useState<any>(null)
  const [simpleActualCash, setSimpleActualCash] = useState<string>('')

  const isRtl = locale === 'ar'

  // Fetch summary and settings when opening or moving to REVIEW
  useEffect(() => {
    if (open) {
      if (activeShift) fetchSummary()
      fetchSettings()
    }
  }, [open, activeShift])

  const fetchSettings = async () => {
    try {
      const s = await getSystemSettings()
      setSystemSettings(s)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSummary = async () => {
    if (!activeShift) return
    setLoading(true)
    try {
      const res = await getShiftSummary(activeShift.id)
      setSummary(res)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load shift summary')
    } finally {
      setLoading(false)
    }
  }

  const actualCashCounted = useMemo(() => {
    if (systemSettings?.enableDenominationCounting === false) {
      return parseFloat(simpleActualCash || '0')
    }
    
    let total = 0
    DENOMINATIONS.forEach(d => {
      const count = parseInt(counts[d.key] || '0')
      total += count * d.value
    })
    total += parseFloat(coins || '0')
    return total
  }, [counts, coins, simpleActualCash, systemSettings])

  const difference = useMemo(() => {
    if (!summary) return 0
    return actualCashCounted - summary.expectedCash
  }, [actualCashCounted, summary])

  const handleNext = () => {
    if (step === 'REVIEW') setStep('COUNT')
    else if (step === 'COUNT') setStep('CONFIRM')
  }

  const handleBack = () => {
    if (step === 'COUNT') setStep('REVIEW')
    else if (step === 'CONFIRM') setStep('COUNT')
  }

  const handleCloseShift = async () => {
    if (!activeShift) return
    setLoading(true)
    try {
      const res = await closeShift(activeShift.id, {
        actualCash: actualCashCounted,
        denominations: { ...counts, coins }
      })
      
      setClosedShiftResult(res)
      setStep('FINISH')
      
      toast.success('Shift Closed Successfully')
      
      // Update store
      setVaultData({ 
        activeShift: null, // This will be refetched by dashboard which now creates a new one
        cashInDrawer: 0,
        transactions: [] 
      })
      
      router.refresh()
      
    } catch (err) {
      console.error(err)
      toast.error('Failed to close shift')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!closedShiftResult) return
    try {
      const QRCode = (await import('qrcode')).default
      const qrDataUrl = await QRCode.toDataURL(`SHIFT-${closedShiftResult.id}-${closedShiftResult.totalSales}`, { width: 200 })
      
      const blob = await pdf(
        <ShiftReportDocument 
          shift={closedShiftResult} 
          qrCodeDataUrl={qrDataUrl} 
          locale={locale} 
        />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shift-report-${closedShiftResult.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    }
  }

  const renderStepper = () => (
    <div className="flex items-center justify-center w-full mt-4 lg:mt-0 lg:w-auto px-2 sm:px-6">
      {[
        { id: 'REVIEW', label: t('review') || 'Review' },
        { id: 'COUNT', label: t('countCash') || 'Count Cash' },
        { id: 'CONFIRM', label: t('confirm') || 'Confirm' },
        { id: 'FINISH', label: t('finish') || 'Finish' }
      ].map((s, idx, arr) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center relative">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
              step === s.id ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110" : 
              arr.findIndex(item => item.id === step) > idx ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-800"
            )}>
              {arr.findIndex(item => item.id === step) > idx ? <CheckCircle2 size={20} /> : idx + 1}
            </div>
            <span className={cn(
              "absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
              step === s.id ? "text-blue-600" : "text-gray-400"
            )}>
              {s.label}
            </span>
          </div>
          {idx < arr.length - 1 && (
            <div className={cn(
              "w-6 sm:w-12 md:w-20 lg:w-24 h-0.5 mx-1 sm:mx-2 rounded-full",
              arr.findIndex(item => item.id === step) > idx ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-800"
            )} />
          )}
        </div>
      ))}
    </div>
  )

  const renderReview = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Sales Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 px-2">{t('salesSummary')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: t('cashSales'), value: summary?.cashSales || 0, icon: Wallet, color: 'emerald' },
              { label: t('cardSales'), value: summary?.cardSales || 0, icon: CreditCard, color: 'blue' },
              { label: t('tamara'), value: summary?.tamaraSales || 0, icon: Receipt, color: 'rose' },
              { label: t('tabby'), value: summary?.tabbySales || 0, icon: Receipt, color: 'indigo' },
              { label: t('creditSales'), value: summary?.creditSales || 0, icon: History, color: 'amber' },
              { label: t('totalInvoices'), value: summary?.invoiceCount || 0, icon: Receipt, color: 'gray', isCount: true }
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("p-2 rounded-xl bg-gray-50 dark:bg-gray-800", `text-${card.color}-500`)}>
                    <card.icon size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{card.label}</span>
                </div>
                <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                  {card.isCount ? card.value : card.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {!card.isCount && <span className="text-[10px] font-normal ml-1 opacity-40">SAR</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Cash Panel */}
        <div className="bg-blue-600 rounded-[2.5rem] p-6 sm:p-10 text-white flex flex-col justify-center min-h-[300px] shadow-2xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Banknote size={24} />
            </div>
            <h3 className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">{t('expectedCashInDrawer')}</h3>
            <p className="text-5xl font-black tracking-tighter tabular-nums">
              {summary?.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="text-lg font-bold ml-3 text-blue-200">{t('sar')}</span>
            </p>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4 text-blue-100 text-xs italic">
            <AlertCircle size={14} />
            <p>{t('onlyCashAffectsReconciliation')}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCount = () => {
    const isDenomMode = systemSettings?.enableDenominationCounting !== false

    return (
      <div className={cn(
        "grid gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500",
        isDenomMode ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-xl mx-auto"
      )}>
        {isDenomMode ? (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 px-2">{t('denominations')}</h3>
            <div className="grid grid-cols-1 gap-3 bg-gray-50 dark:bg-gray-900 p-3 sm:px-6 sm:py-4 rounded-[2rem]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DENOMINATIONS.map((d) => (
                  <div key={d.key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 font-bold text-[10px]">
                        {d.value}
                      </div>
                      <Label className="font-bold text-xs text-gray-600 dark:text-gray-300">{d.label}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={counts[d.key] || ''}
                        onChange={(e) => setCounts({ ...counts, [d.key]: e.target.value })}
                        className="w-16 h-8 text-center font-black rounded-lg border-gray-200 text-xs p-1"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 font-bold text-xs">
                      🪙
                    </div>
                    <Label className="font-bold text-xs text-gray-600 dark:text-gray-300">{t('coins') || 'Coins'}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={coins}
                      onChange={(e) => setCoins(e.target.value)}
                      className="w-16 h-8 text-center font-black rounded-lg border-gray-200 text-xs p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-10">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('manualCashReconciliation') || 'Manual Cash Reconciliation'}</h3>
              <p className="text-sm text-gray-500">{t('enterTotalPhysicalCash') || 'Enter the total physical cash amount in the drawer.'}</p>
            </div>
            <div className="relative max-w-sm mx-auto">
              <Banknote size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                type="number"
                step="0.01"
                placeholder="0.00"
                autoFocus
                value={simpleActualCash}
                onChange={(e) => setSimpleActualCash(e.target.value)}
                className="h-20 ps-14 text-3xl font-black rounded-3xl border-2 border-gray-200 focus:border-blue-500 tabular-nums shadow-sm"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col justify-center gap-8">
          <div className="space-y-2 text-center">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t('actualCashCounted')}</Label>
            <p className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter tabular-nums text-gray-900 dark:text-white leading-none">
              {actualCashCounted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className={cn(
            "p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-500",
            difference === 0 ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30" : 
            "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30"
          )}>
            <div className={cn("p-4 rounded-3xl", difference === 0 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white shadow-lg")}>
              {difference === 0 ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('discrepancyAmount')}</span>
              <p className="text-3xl font-black tabular-nums">
                {difference > 0 ? '+' : ''}{difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xs ml-2 font-bold">{t('sar')}</span>
              </p>
            </div>
            {difference !== 0 && (
              <p className="text-[10px] font-bold text-amber-600/60 text-center px-6 leading-relaxed">
                {t('discrepancyNote')}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderConfirm = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-[3rem] p-10 space-y-8 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-6 pb-8 border-b border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30">
            <User size={40} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{activeShift?.openedBy?.name || t('cashier')}</h3>
            <div className="flex items-center gap-4 mt-1 text-gray-400 text-sm font-bold">
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{summary && new Date().toLocaleTimeString()}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <span>{t('shift')} ID: #{activeShift?.id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('totalInvoices')}</span>
              <p className="text-xl font-black text-gray-900 dark:text-white">{summary?.invoiceCount}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('totalShiftSales')}</span>
              <p className="text-xl font-black text-gray-900 dark:text-white">{summary?.totalSales.toFixed(2)} {t('sar')}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('expectedCash')}</span>
              <p className="text-xl font-black text-gray-900 dark:text-white">{summary?.expectedCash.toFixed(2)} {t('sar')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('actualCounted')}</span>
              <p className="text-xl font-black text-emerald-600">{actualCashCounted.toFixed(2)} {t('sar')}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "p-6 rounded-[2rem] flex items-center justify-between",
          difference === 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
        )}>
          <span className="font-black uppercase text-xs tracking-wider">{t('reconciliationStatus')}</span>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tabular-nums">{difference.toFixed(2)} {t('sar')}</span>
            {difference === 0 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
        </div>
      </div>
    </div>
  )

  const renderFinish = () => (
    <div className="max-w-md mx-auto text-center space-y-8 animate-in zoom-in-95 duration-500">
      <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
        <CheckCircle2 size={48} strokeWidth={2.5} />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{t('shiftClosedSuccessfully')}</h2>
        <p className="text-gray-400 font-medium">{t('shiftArchiveNote')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-4">
        <Button 
          className="h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg gap-3"
          onClick={handleDownloadPDF}
        >
          <Download size={20} />
          {t('downloadReport')}
        </Button>
        <Button 
          variant="outline"
          className="h-16 rounded-[1.5rem] border-gray-200 font-black text-lg gap-3"
          onClick={() => onOpenChange(false)}
        >
          {t('closeWorkflow')}
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-6xl w-full h-[95vh] sm:h-[90vh] p-0 overflow-hidden border-none shadow-3xl rounded-[2rem] sm:rounded-[3rem] bg-white dark:bg-gray-950 flex flex-col">
        {/* Header - Responsive Layout */}
        <div className="p-6 sm:p-8 lg:p-10 border-b border-gray-100 dark:border-gray-900 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div className="space-y-1 text-center lg:text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('shiftClosingWorkflow')}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs sm:text-sm font-medium">
              {t('professionalReconciliationNote')}
            </DialogDescription>
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            {step !== 'FINISH' && renderStepper()}
          </div>
          <div className="hidden lg:block w-10 h-10" /> {/* Spacer for symmetry */}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-10 bg-gray-50/50 dark:bg-gray-900/30">
          {step === 'REVIEW' && renderReview()}
          {step === 'COUNT' && renderCount()}
          {step === 'CONFIRM' && renderConfirm()}
          {step === 'FINISH' && renderFinish()}
        </div>

        {/* Footer - Responsive */}
        {step !== 'FINISH' && (
          <div className="p-4 sm:p-8 border-t border-gray-100 dark:border-gray-900 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center bg-white dark:bg-gray-950 gap-4">
            <Button 
              variant="ghost" 
              className="h-12 sm:h-14 px-4 sm:px-8 rounded-2xl text-gray-400 hover:text-gray-900 font-bold gap-2"
              onClick={step === 'REVIEW' ? () => onOpenChange(false) : handleBack}
            >
              <ArrowLeft size={18} />
              {step === 'REVIEW' ? t('cancel') : t('back')}
            </Button>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {step === 'CONFIRM' ? (
                <Button 
                  className="h-12 sm:h-14 px-6 sm:px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base sm:text-lg shadow-xl shadow-emerald-500/20 gap-3"
                  onClick={handleCloseShift}
                  disabled={loading}
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                    <>
                      <span className="whitespace-nowrap">{t('finalizeAndClose')}</span>
                      <CheckCircle2 size={20} className="shrink-0" />
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  className="h-12 sm:h-14 px-6 sm:px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base sm:text-lg shadow-xl shadow-blue-500/20 gap-3"
                  onClick={handleNext}
                  disabled={loading || !summary}
                >
                  <span>{t('next')}</span>
                  <ArrowRight size={18} className="shrink-0" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
