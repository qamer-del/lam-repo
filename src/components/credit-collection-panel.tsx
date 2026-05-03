'use client'

import { useState } from 'react'
import {
  Users, Phone, Banknote, Wifi, Search, Receipt,
  AlertCircle, Clock, CheckCircle2
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { collectCreditPayment } from '@/actions/transactions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/providers/language-provider'
import { ModernLoader } from './ui/modern-loader'

type CreditSale = {
  id: number
  amount: number
  invoiceNumber: string | null
  customerName: string | null
  customerPhone: string | null
  customerId: number | null
  createdAt: string | Date
  linkedBy?: { amount: number }[]
}

type CustomerGroup = {
  key: string
  customerId: number | null
  name: string
  phone: string
  totalOutstanding: number
  invoiceCount: number
  oldestDate: Date
  invoices: (CreditSale & { remaining: number })[]
}

function groupByCustomer(sales: CreditSale[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>()

  // Filter for unsettled credit sales first
  const unpaidCreditSales = sales.filter(s => 
    (s as any).method === 'CREDIT' && !(s as any).isSettled
  )

  for (const sale of unpaidCreditSales) {
    const paidSoFar = (sale.linkedBy || []).reduce((sum, p) => sum + p.amount, 0)
    const remaining = sale.amount - paidSoFar
    if (remaining < 0.01) continue // Fully paid, skip

    const key = sale.customerId
      ? `id_${sale.customerId}`
      : `${sale.customerName || 'Unknown'}|${sale.customerPhone || ''}`

    if (!map.has(key)) {
      map.set(key, {
        key,
        customerId: sale.customerId,
        name: sale.customerName || 'Walk-in Customer',
        phone: sale.customerPhone || '',
        totalOutstanding: 0,
        invoiceCount: 0,
        oldestDate: new Date(sale.createdAt),
        invoices: [],
      })
    }

    const group = map.get(key)!
    group.totalOutstanding += remaining
    group.invoiceCount += 1
    group.invoices.push({ ...sale, remaining })

    const saleDate = new Date(sale.createdAt)
    if (saleDate < group.oldestDate) {
      group.oldestDate = saleDate
    }
  }

  // Sort by highest outstanding balance
  return Array.from(map.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding)
}

export function CreditCollectionPanel({ sales }: { sales: CreditSale[] }) {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'CASH' | 'NETWORK'>('CASH')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const groups = groupByCustomer(sales)
  const filtered = groups.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return g.name.toLowerCase().includes(q) || g.phone.includes(q)
  })

  const openPayment = (customer: CustomerGroup) => {
    setSelectedCustomer(customer)
    setPayAmount(customer.totalOutstanding.toFixed(2))
    setPayMethod('CASH')
    setPayOpen(true)
  }

  const handleCollect = async () => {
    if (!selectedCustomer) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.warning(t('amount') + ' > 0')
      return
    }
    if (amount > selectedCustomer.totalOutstanding + 0.01) {
      toast.warning(`Max: ${selectedCustomer.totalOutstanding.toFixed(2)} SAR`)
      return
    }

    setLoading(true)
    try {
      await collectCreditPayment({
        customerId: selectedCustomer.customerId || undefined,
        customerName: selectedCustomer.customerId ? undefined : selectedCustomer.name,
        customerPhone: selectedCustomer.customerId ? undefined : selectedCustomer.phone,
        amount,
        paymentMethod: payMethod,
      })
      toast.success(t('paymentCollected'))
      setPayOpen(false)
      setSelectedCustomer(null)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to collect payment')
    } finally {
      setLoading(false)
    }
  }

  const remainingAfter = selectedCustomer
    ? selectedCustomer.totalOutstanding - (parseFloat(payAmount) || 0)
    : 0

  const isFullPayment = selectedCustomer
    ? Math.abs(selectedCustomer.totalOutstanding - (parseFloat(payAmount) || 0)) < 0.01
    : false

  if (groups.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-gray-50/50 dark:bg-gray-900/20">
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-gray-500 font-medium">{t('noOutstandingCredit')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('allDebtsSettled')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {loading && <ModernLoader />}

      <div className="space-y-3">
        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder={t('searchByNameOrPhone')}
            className="block w-full pl-11 pr-4 py-3.5 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-amber-500/50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Collapsing Customer List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 pb-4 no-scrollbar">
          {filtered.map(customer => {
            const daysOld = differenceInDays(new Date(), customer.oldestDate)
            const isOverdue = daysOld > 30
            const isExpanded = expandedId === customer.key

            return (
              <div
                key={customer.key}
                className={cn(
                  'relative rounded-2xl border transition-all duration-300 overflow-hidden',
                  isOverdue
                    ? 'border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
                  isExpanded ? 'shadow-md' : 'hover:border-amber-300/50 hover:shadow-sm'
                )}
              >
                {/* Header (Always Visible) - Click to expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : customer.key)}
                  className="w-full flex items-center justify-between p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0',
                      isOverdue
                        ? 'bg-gradient-to-br from-red-400 to-red-600'
                        : 'bg-gradient-to-br from-amber-400 to-amber-600'
                    )}>
                      {customer.name[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {customer.name}
                      </p>
                      {customer.phone && (
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-gray-400" /> {customer.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className={cn(
                        'text-lg font-black tabular-nums tracking-tighter',
                        isOverdue ? 'text-red-600' : 'text-amber-600'
                      )}>
                        {customer.totalOutstanding.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">SAR</p>
                    </div>
                  </div>
                </button>

                {/* Collapsible Content */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800/50 mt-2">
                    <div className="flex items-center gap-2 mb-4 flex-wrap pt-3">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                        <Receipt size={12} className="text-gray-400" /> {customer.invoiceCount} {t('invoices')}
                      </span>
                      <span className={cn(
                        'flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md',
                        isOverdue
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      )}>
                        <Clock size={12} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                        {format(customer.oldestDate, 'MMM d, yyyy')}
                        {isOverdue && (
                          <span className="ml-1 text-red-600 dark:text-red-400">
                            · {t('overdue')}
                          </span>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => openPayment(customer)}
                      className={cn(
                        'w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                        isOverdue
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 active:scale-[0.98]'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98]'
                      )}
                    >
                      <Banknote size={14} />
                      {t('collectPayment')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && search && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">{t('noCustomersWithBalance')}</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl font-cairo">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
            <DialogHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-black text-2xl">
                  {selectedCustomer?.name[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black">{t('collectPayment')}</DialogTitle>
                  <p className="text-amber-100 text-sm mt-1 font-bold">{selectedCustomer?.name}</p>
                  {selectedCustomer?.phone && (
                    <p className="text-amber-200/70 text-xs flex items-center gap-1 mt-0.5">
                      <Phone size={10} /> {selectedCustomer.phone}
                    </p>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            {/* Outstanding summary */}
            <div className="p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{t('totalDue')}</span>
                <span className="text-xl font-black text-amber-600 tabular-nums">
                  {selectedCustomer?.totalOutstanding.toFixed(2)} <span className="text-xs font-normal">SAR</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{t('invoices')}</span>
                <span className="text-sm font-bold text-gray-600">
                  {selectedCustomer?.invoiceCount}
                </span>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('enterAmount')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCustomer?.totalOutstanding}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="text-2xl font-black h-16 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-amber-500 transition-all tabular-nums pr-16"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">SAR</span>
              </div>

              {/* Remaining preview */}
              {payAmount && (
                <div className={cn(
                  'flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-bold animate-in slide-in-from-bottom-2 duration-300',
                  isFullPayment
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                )}>
                  <span>{isFullPayment ? t('fullPayment') : t('partialPayment')}</span>
                  <span className="tabular-nums">
                    {t('remainingAfter')}: {Math.max(0, remainingAfter).toFixed(2)} SAR
                  </span>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('paymentMethod')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPayMethod('CASH')}
                  className={cn(
                    'flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all group',
                    payMethod === 'CASH'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-900 border-transparent text-gray-400 hover:border-gray-200'
                  )}
                >
                  <Banknote size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[10px] uppercase tracking-wider">{t('cash')}</span>
                </button>
                <button
                  onClick={() => setPayMethod('NETWORK')}
                  className={cn(
                    'flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all group',
                    payMethod === 'NETWORK'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-900 border-transparent text-gray-400 hover:border-gray-200'
                  )}
                >
                  <Wifi size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[10px] uppercase tracking-wider">{t('network')}</span>
                </button>
              </div>
            </div>

            {/* Confirm */}
            <Button
              onClick={handleCollect}
              disabled={loading || !payAmount || parseFloat(payAmount) <= 0}
              className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  {t('collectPayment')} · {parseFloat(payAmount || '0').toFixed(2)} SAR
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setPayOpen(false)}
              className="w-full text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-gray-600"
            >
              {t('cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
