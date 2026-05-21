'use client'

import { useState, useEffect } from 'react'
import { Wallet, CheckCircle2, Download, AlertTriangle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useLanguage } from '@/providers/language-provider'
import { settleSalary } from '@/actions/transactions'
import { getStaffOverdueCredits } from '@/actions/staff'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { SalarySettlementDocument } from './salary-settlement-pdf'
import { toast } from 'sonner'
import { useStore, Transaction } from '@/store/useStore'

// Calculate pro-rated earned salary using daily rate method
function calcProRation(monthlySalary: number, upToDate: Date, month: number, year: number, joiningDate?: Date | null) {
  const totalDays = new Date(year, month, 0).getDate() // total calendar days in month
  let startDay = 1
  if (joiningDate) {
    const jd = new Date(joiningDate)
    if (jd.getFullYear() === year && jd.getMonth() + 1 === month) {
      startDay = jd.getDate()
    }
  }
  const upToDay = Math.min(upToDate.getDate(), totalDays)
  const workedDays = Math.max(1, upToDay - startDay + 1)
  const earnedSalary = parseFloat(((monthlySalary / totalDays) * workedDays).toFixed(2))
  return { totalDays, workedDays, earnedSalary, startDay }
}

export function SalarySettlementModal({ 
  staff, 
  advances, 
  totalAdvances, 
  absenceHours,
  absenceDeduction,
  netPaid 
}: { 
  staff: { 
    id: number, 
    name: string, 
    baseSalary: number,
    overtimeAllowance?: number,
    transportAllowance?: number,
    otherAllowance?: number,
    joiningDate?: Date | null
  },
  advances: any[],
  totalAdvances: number,
  absenceHours?: number,
  absenceDeduction?: number,
  netPaid: number
}) {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<'CASH' | 'NETWORK' | 'SPLIT'>('CASH')
  const [cashAmount, setCashAmount] = useState<string>('')
  const [networkAmount, setNetworkAmount] = useState<string>('')
  const [settledData, setSettledData] = useState<any>(null)
  const [overdueInfo, setOverdueInfo] = useState<{count: number, total: number, invoices: any[]} | null>(null)
  const [deductOverdueCredit, setDeductOverdueCredit] = useState(false)
  const [showInvoices, setShowInvoices] = useState(false)

  // Settle-up-to date (defaults to today)
  const today = new Date()
  const [settledUpToDate, setSettledUpToDate] = useState<Date>(today)

  // Pro-ration values (computed from the settle-up-to date)
  const now = settledUpToDate
  const totalMonthlySalary = staff.baseSalary + (staff.overtimeAllowance || 0) + (staff.transportAllowance || 0) + (staff.otherAllowance || 0)
  const { totalDays, workedDays, earnedSalary } = calcProRation(
    totalMonthlySalary,
    now,
    now.getMonth() + 1,
    now.getFullYear(),
    staff.joiningDate
  )
  const isFullMonth = workedDays === totalDays

  const overdueDeduction = deductOverdueCredit && overdueInfo ? overdueInfo.total : 0
  const absenceAmt = absenceDeduction || 0
  const currentNetPayable = earnedSalary - absenceAmt - totalAdvances - overdueDeduction

  useEffect(() => {
    if (method === 'SPLIT') {
      const half = (currentNetPayable / 2).toFixed(2)
      setCashAmount(half)
      setNetworkAmount((currentNetPayable - parseFloat(half)).toFixed(2))
    } else {
      setCashAmount('')
      setNetworkAmount('')
    }
  }, [method, currentNetPayable])

  useEffect(() => {
    if (open) {
      getStaffOverdueCredits(staff.id).then(setOverdueInfo).catch(console.error)
    } else {
      setDeductOverdueCredit(false)
      setOverdueInfo(null)
    }
  }, [open, staff.id])

  const handleCashAmountChange = (val: string) => {
    setCashAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0 && num <= currentNetPayable) {
      setNetworkAmount((currentNetPayable - num).toFixed(2))
    }
  }

  const handleNetworkAmountChange = (val: string) => {
    setNetworkAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0 && num <= currentNetPayable) {
      setCashAmount((currentNetPayable - num).toFixed(2))
    }
  }

  const handleSettle = async () => {
    setLoading(true)
    try {
      const res = await settleSalary({
        staffId: staff.id,
        month: settledUpToDate.getMonth() + 1,
        year: settledUpToDate.getFullYear(),
        method,
        cashAmount: method === 'SPLIT' ? parseFloat(cashAmount) : undefined,
        networkAmount: method === 'SPLIT' ? parseFloat(networkAmount) : undefined,
        deductOverdueCredit,
        absenceHours: absenceHours || 0,
        absenceDeduction: absenceDeduction || 0,
        settledUpToDate,
      })
      setSettledData(res)
      toast.success('Salary Settled', {
        description: `Successfully settled salary for ${staff.name}. Net payout: ${currentNetPayable.toFixed(2)} SAR.`,
      })
      
      // Update store for real-time ledger sync
      const { transactions, setVaultData, addTransaction } = useStore.getState()
      const updatedTxs = transactions.map(t => 
        (t.staffId === staff.id && !t.isSettled) ? { ...t, isSettled: true } : t
      )
      setVaultData({ transactions: updatedTxs })
      if (res && res.paymentTransactions && res.paymentTransactions.length > 0) {
        res.paymentTransactions.forEach((tx: any) => addTransaction(tx as Transaction))
      } else if (res && res.paymentTransaction) {
        addTransaction(res.paymentTransaction as Transaction)
      }
    } catch (error) {
      console.error(error)
      toast.error('Settlement Failed', {
        description: 'An error occurred during salary settlement.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setSettledData(null); }}>
        <DialogTrigger render={<Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-500/20" />}>
          <Wallet size={16} />
          Settle Salary
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto font-cairo">
          {!settledData ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="text-emerald-500" />
                  Salary Settlement: {staff.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-6 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    This will mark all current advances as <strong>settled</strong> and record a final payout transaction. This action cannot be undone.
                  </p>
                </div>

                {/* ── Settle Up To Date Picker ─── */}
                <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Settlement Period</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-gray-400 font-bold uppercase">Paid up to date</Label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-black/20 px-3 py-2 text-sm font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={settledUpToDate.toISOString().split('T')[0]}
                        max={today.toISOString().split('T')[0]}
                        onChange={(e) => {
                          const d = new Date(e.target.value + 'T12:00:00')
                          if (!isNaN(d.getTime())) setSettledUpToDate(d)
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-black ${isFullMonth ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {workedDays}<span className="text-sm font-medium text-gray-400">/{totalDays}</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Days Worked</div>
                    </div>
                  </div>
                  {!isFullMonth && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Pro-rated salary: <strong>{earnedSalary.toFixed(2)} SAR</strong> ({workedDays}/{totalDays} days × {totalMonthlySalary.toFixed(2)} SAR/month)
                    </p>
                  )}
                  {isFullMonth && (
                    <p className="text-[10px] text-emerald-600 font-medium">
                      ✓ Full month — paying 100% of monthly salary ({totalMonthlySalary.toFixed(2)} SAR)
                    </p>
                  )}
                </div>

                {/* ── Salary Breakdown ─── */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400 font-bold uppercase">{t('baseSalary')}</span>
                    <span className="font-bold">{staff.baseSalary.toFixed(2)}</span>
                  </div>
                  {(staff.overtimeAllowance || 0) > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-bold uppercase">{t('overtime')}</span>
                      <span className="font-bold">{staff.overtimeAllowance?.toFixed(2)}</span>
                    </div>
                  )}
                  {(staff.transportAllowance || 0) > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-bold uppercase">{t('transport')}</span>
                      <span className="font-bold">{staff.transportAllowance?.toFixed(2)}</span>
                    </div>
                  )}
                  {(staff.otherAllowance || 0) > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-bold uppercase">{t('otherAllowance')}</span>
                      <span className="font-bold">{staff.otherAllowance?.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Show pro-ration row only when not a full month */}
                  {!isFullMonth && (
                    <div className="flex justify-between text-[10px] border-t border-blue-100 dark:border-blue-900/30 pt-2">
                      <span className="text-blue-500 font-bold uppercase">Pro-rated ({workedDays}/{totalDays} days)</span>
                      <span className="font-bold text-blue-600">{earnedSalary.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">{t('advancesDeducted') || 'Advances Deducted'}</span>
                    <span className="font-bold text-red-500">- {totalAdvances.toFixed(2)}</span>
                  </div>
                  {(absenceDeduction || 0) > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-bold uppercase">Absence ({(absenceHours || 0).toFixed(1)} hrs)</span>
                      <span className="font-bold text-rose-500">- {(absenceDeduction || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {overdueDeduction > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-bold uppercase">Overdue Credit Deduction</span>
                      <span className="font-bold text-rose-500">- {overdueDeduction.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                    <span className="text-emerald-600 font-black uppercase text-xs">{t('netSalary')}</span>
                    <span className="text-xl font-black text-emerald-600">
                      {currentNetPayable.toFixed(2)}
                    </span>
                  </div>
                </div>

                {overdueInfo && overdueInfo.count > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl space-y-3 shadow-sm">
                    <div className="flex gap-3 text-red-600">
                      <AlertTriangle size={20} className="shrink-0" />
                      <div>
                        <p className="text-sm font-bold">Unpaid Credit Warning</p>
                        <p className="text-xs mt-1 text-red-800 dark:text-red-400">
                          {staff.name} recorded <strong>{overdueInfo.count}</strong> unpaid credit invoice(s) totaling <strong>{overdueInfo.total.toFixed(2)} SAR</strong>.
                        </p>
                        <button 
                          type="button"
                          onClick={() => setShowInvoices(!showInvoices)} 
                          className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-widest mt-2 hover:underline"
                        >
                          {showInvoices ? 'Hide Invoices' : 'View Invoices'}
                        </button>
                      </div>
                    </div>

                    {showInvoices && (
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                        {overdueInfo.invoices.map((inv: any) => (
                          <div key={inv.id} className="flex justify-between text-[10px] text-red-800 dark:text-red-300 border-b border-red-100/50 dark:border-red-900/20 last:border-0 pb-1 last:pb-0">
                            <span className="truncate pr-2">{inv.invoiceNumber || `#${inv.id}`} • {inv.customerName || 'No Name'}</span>
                            <span className="font-bold shrink-0">{inv.remaining.toFixed(2)} SAR</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-red-200 dark:border-red-800 flex items-start gap-2">
                      <input 
                        type="checkbox" 
                        id="deductCredit" 
                        className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300"
                        checked={deductOverdueCredit}
                        onChange={(e) => setDeductOverdueCredit(e.target.checked)}
                      />
                      <label htmlFor="deductCredit" className="text-xs text-red-800 dark:text-red-400 cursor-pointer">
                        Deduct overdue credit invoices ({overdueInfo.total.toFixed(2)} SAR) from this salary settlement.
                        <br/>
                        <span className="text-[10px] opacity-80">(This will mark the customer invoices as paid via the employee's salary)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Payment Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="w-full py-6 rounded-xl border-gray-200 focus:ring-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash Payment (Salary Fund)</SelectItem>
                      <SelectItem value="NETWORK">Network / Bank Transfer</SelectItem>
                      <SelectItem value="SPLIT">Split Payment (Cash + Network)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {method === 'SPLIT' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl animate-in fade-in-50 slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-gray-400">Cash Portion (SAR)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={currentNetPayable}
                        step="0.01"
                        value={cashAmount}
                        onChange={(e) => handleCashAmountChange(e.target.value)}
                        className="rounded-xl border-emerald-100 focus-visible:ring-emerald-500 font-bold bg-white dark:bg-black/20"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-gray-400">Network Portion (SAR)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={currentNetPayable}
                        step="0.01"
                        value={networkAmount}
                        onChange={(e) => handleNetworkAmountChange(e.target.value)}
                        className="rounded-xl border-emerald-100 focus-visible:ring-emerald-500 font-bold bg-white dark:bg-black/20"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2 text-center pt-1">
                      {(() => {
                        const cash = parseFloat(cashAmount) || 0
                        const net = parseFloat(networkAmount) || 0
                        const diff = Math.abs((cash + net) - currentNetPayable)
                        if (diff > 0.01) {
                          return (
                            <p className="text-[10px] text-rose-500 font-semibold">
                              Sum ({ (cash + net).toFixed(2) }) must equal Net Salary ({ currentNetPayable.toFixed(2) })
                            </p>
                          )
                        }
                        return (
                          <p className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Split allocation matches net salary perfectly!
                          </p>
                        )
                      })()}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSettle} 
                  disabled={
                    method === 'SPLIT' && (() => {
                      const cash = parseFloat(cashAmount) || 0
                      const net = parseFloat(networkAmount) || 0
                      return Math.abs((cash + net) - currentNetPayable) >= 0.01 || cash < 0 || net < 0
                    })()
                  }
                  className="w-full py-6 mt-4 bg-emerald-600 hover:bg-emerald-700 font-bold text-lg rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Clear Balance
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Settlement Successful!</h3>
                <p className="text-sm text-gray-500 mt-2">Salary balance for {staff.name} has been reset.</p>
              </div>

              <div className="flex flex-col gap-3">
                <PDFDownloadLink
                  document={
                    <SalarySettlementDocument 
                      locale={locale}
                      staffName={staff.name}
                      month={settledData.month}
                      year={settledData.year}
                      baseSalary={settledData.baseSalary}
                      earnedSalary={settledData.earnedSalary}
                      workedDays={settledData.workedDays}
                      totalDays={settledData.totalDays}
                      overtimeAllowance={staff.overtimeAllowance}
                      transportAllowance={staff.transportAllowance}
                      otherAllowance={staff.otherAllowance}
                      advances={advances}
                      totalAdvances={settledData.advancesTally}
                      netPaid={settledData.netPaid}
                      paymentMethod={settledData.method}
                      cashAmount={settledData.cashAmount}
                      networkAmount={settledData.networkAmount}
                    />
                  }
                  fileName={`Settlement_${staff.name}_${settledData.month}_${settledData.year}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button variant="outline" disabled={pdfLoading} className="w-full py-6 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <Download size={18} />
                      {pdfLoading ? 'Preparing PDF...' : 'Download Settlement Advice'}
                    </Button>
                  )}
                </PDFDownloadLink>
                
                <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 text-xs">
                  Close Window
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
