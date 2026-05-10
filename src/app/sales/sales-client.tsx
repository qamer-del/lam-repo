'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/providers/language-provider'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { 
  Receipt, Coins, CreditCard, Download, Filter, Calculator, 
  TrendingDown, ArrowUpRight, ArrowDownLeft, Users, CheckCircle, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crown, Percent
} from 'lucide-react'
import { AddSalesModal } from '@/components/add-sales-modal'
import { AddRefundModal } from '@/components/add-refund-modal'
import { CloseShiftBtn } from '@/components/close-shift-btn'
import { ViewInvoiceModal } from '@/components/view-invoice-modal'
import { CreditCollectionPanel } from '@/components/credit-collection-panel'
import { SalesDocument } from '@/components/sales-document'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useStore, Transaction } from '@/store/useStore'

export default function SalesPage({
  initialSales,
  initialMovements,
  userRole,
  unpaidCreditSales,
  cashierPerformance,
}: {
  initialSales?: any[]
  initialMovements?: any[]
  userRole?: string
  unpaidCreditSales?: any[] | null
  cashierPerformance?: { id: string, name: string, dailySales: number, monthlySales: number }[]
}) {
  const { t, locale } = useLanguage()
  const { data: session } = useSession()
  const isCashier = userRole === 'CASHIER' || session?.user?.role === 'CASHIER'
  const isOwner = userRole === 'OWNER' || session?.user?.role === 'OWNER'
  const isAdmin = userRole === 'ADMIN' || session?.user?.role === 'ADMIN' || userRole === 'SUPER_ADMIN' || session?.user?.role === 'SUPER_ADMIN'
  const canViewStats = isAdmin || isOwner

  const { transactions: storeTransactions, setVaultData } = useStore()
  
  // Sync server data to store on initial load
  useEffect(() => {
    if (initialSales || initialMovements) {
      setVaultData({
        transactions: initialSales || [],
        cashInDrawer: 0, // These will be overwritten by dashboard fetch anyway
        networkSales: 0,
        salaryFundRemaining: 0,
        totalOutstandingCredit: 0,
        recentSettlements: [],
        ... (initialSales ? { transactions: initialSales } : {})
      })
    }
  }, [initialSales, setVaultData])

  const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [toDate, setToDate]     = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [manualProfit, setManualProfit] = useState<string>('')
  const [commissionRate, setCommissionRate] = useState<string>('0')
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'transactions' | 'credit' | 'performance'>('transactions')
  const ITEMS_PER_PAGE = 10
  
  const sales = storeTransactions
  const movements = initialMovements || [] // Movements are currently still server-side for profit calc

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, fromDate, toDate])

  // ── Date-filtered sales ───────────────────────────────────────────────────
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt)
    const start = new Date(fromDate); start.setHours(0, 0, 0, 0)
    const end   = new Date(toDate);   end.setHours(23, 59, 59, 999)
    return isWithinInterval(saleDate, { start, end })
  })

  // ── Aggregate into invoice groups ─────────────────────────────────────────
  let totalCash    = 0
  let totalNetwork = 0
  let totalGrossRevenue = 0
  let unsettledCash = 0
  let unsettledNetwork = 0
  let unsettledTabby = 0
  let unsettledTamara = 0
  let hasUnsettled = false

  // Net Credit represents total unpaid credit all-time, not just in this date range
  const totalCredit = sales.filter(s => s.method === 'CREDIT' && !s.isSettled).reduce((sum, s) => sum + s.amount, 0)

  const groups = new Map<string, any>()

  filteredSales.forEach(sale => {
    const isNetworkLike = ['NETWORK', 'TABBY', 'TAMARA'].includes(sale.method)
    const isCredit = sale.method === 'CREDIT'
    const isSettlement = !!sale.linkedTransactionId

    if (sale.type === 'SALE') {
      if (sale.method === 'CASH') totalCash    += sale.amount
      if (isNetworkLike)          totalNetwork += sale.amount
      if (!isSettlement)          totalGrossRevenue += sale.amount

      // Tracking for closing shift
      if (!sale.isSettled && !sale.settlementId) {
        hasUnsettled = true
        if (sale.type === 'SALE') {
          if (sale.method === 'CASH') unsettledCash += sale.amount
          if (sale.method === 'NETWORK') unsettledNetwork += sale.amount
          if (sale.method === 'TABBY') unsettledTabby += sale.amount
          if (sale.method === 'TAMARA') unsettledTamara += sale.amount
        } else if (sale.type === 'RETURN') {
          if (sale.method === 'CASH') unsettledCash -= sale.amount
          if (sale.method === 'NETWORK') unsettledNetwork -= sale.amount
          if (sale.method === 'TABBY') unsettledTabby -= sale.amount
          if (sale.method === 'TAMARA') unsettledTamara -= sale.amount
        }
      }
    } else if (sale.type === 'RETURN') {
      if (sale.method === 'CASH') totalCash    -= sale.amount
      if (isNetworkLike)          totalNetwork -= sale.amount
      if (!isSettlement)          totalGrossRevenue -= sale.amount
    }

    // Settlements should be separate rows, not grouped into the original invoice
    const key = isSettlement 
      ? `settlement_${sale.id}` 
      : (sale.invoiceNumber || `${sale.createdAt}_${sale.recordedById}_${sale.type}`)

    if (!groups.has(key)) {
      groups.set(key, {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        type: sale.type,
        isSettlement: isSettlement,
        description: sale.description,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        createdAt: sale.createdAt,
        totalAmount: 0,
        cashAmount: 0,
        networkAmount: 0,
        creditAmount: 0,
        methods: new Set<string>(),
        salesperson: sale.recordedBy?.name || 'Unknown',
      })
    }
    const g = groups.get(key)!
    g.totalAmount += sale.amount
    if (sale.method === 'CASH') g.cashAmount += sale.amount
    if (isNetworkLike)          g.networkAmount += sale.amount
    if (isCredit)               g.creditAmount += sale.amount
    g.methods.add(sale.method)
  })

  // ── Profit calculation ────────────────────────────────────────────────────
  const filteredMovements = movements.filter(m => {
    const mDate = new Date(m.createdAt)
    const start = new Date(fromDate); start.setHours(0, 0, 0, 0)
    const end   = new Date(toDate);   end.setHours(23, 59, 59, 999)
    return isWithinInterval(mDate, { start, end })
  })

  const totalCostOfSales = filteredMovements.reduce((acc, m) => {
    const cost = m.unitCost || m.item?.unitCost || 0
    // SALE_OUT subtracts cost, RETURN_IN adds it back
    return acc + (m.type === 'SALE_OUT' ? Math.abs(m.quantity) * cost : -(Math.abs(m.quantity) * cost))
  }, 0)

  const vatAmount = totalGrossRevenue - (totalGrossRevenue / 1.15)
  const netRevenue = totalGrossRevenue / 1.15
  const autoProfit = netRevenue - totalCostOfSales

  // ── Final row list ────────────────────────────────────────────────────────
  const aggregatedSales = Array.from(groups.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(sale => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        sale.invoiceNumber?.toLowerCase().includes(q) ||
        sale.description?.toLowerCase().includes(q) ||
        sale.id.toString().includes(q)
      )
    })

  const totalPages = Math.ceil(aggregatedSales.length / ITEMS_PER_PAGE)
  const paginatedSales = aggregatedSales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, aggregatedSales.length)

  const totalSales   = aggregatedSales.filter(s => s.type === 'SALE').length
  const totalRefunds = aggregatedSales.filter(s => s.type === 'RETURN').length

  // ── Payment method badge helper ───────────────────────────────────────────
  function MethodBadge({ sale }: { sale: any }) {
    const ms  = sale.methods as Set<string>
    const isReturn  = sale.type === 'RETURN'
    const isSplit   = ms.has('CASH') && (ms.has('NETWORK') || ms.has('TABBY') || ms.has('TAMARA'))
    const hasTabby  = ms.has('TABBY')  && !ms.has('CASH')
    const hasTamara = ms.has('TAMARA') && !ms.has('CASH')
    const hasNet    = ms.has('NETWORK') && !ms.has('CASH')
    const hasCredit = ms.has('CREDIT')

    const label = isReturn  ? 'Refund'
      : hasCredit ? 'Credit'
      : isSplit   ? 'Split'
      : hasTabby  ? 'Tabby'
      : hasTamara ? 'Tamara'
      : hasNet    ? 'Network'
      : 'Cash'

    const cls = isReturn  ? 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400'
      : hasCredit ? 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400'
      : isSplit   ? 'bg-orange-100  text-orange-700  dark:bg-orange-900/30  dark:text-orange-400'
      : hasTabby  ? 'bg-purple-100  text-purple-700  dark:bg-purple-900/30  dark:text-purple-400'
      : hasTamara ? 'bg-pink-100    text-pink-700    dark:bg-pink-900/30    dark:text-pink-400'
      : hasNet    ? 'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400'
      :             'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'

    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap uppercase ${cls}`}>{label}</span>
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto space-y-10 font-sans text-gray-900 dark:text-gray-100">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{format(new Date(), 'EEEE, MMM d')}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('salesReport')}
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {!isCashier && <AddSalesModal triggerClassName="w-full sm:w-auto h-10 sm:h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center" />}
          {!isCashier && (
            <>
              <AddRefundModal triggerClassName="w-full sm:w-auto h-10 sm:h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-sm transition-all flex items-center justify-center" />
            </>
          )}
          {isCashier && (
            hasUnsettled ? (
              <CloseShiftBtn 
                triggerClassName="w-full sm:w-auto h-10 sm:h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all animate-in fade-in duration-500 flex items-center justify-center" 
                cashTotal={unsettledCash} 
                networkTotal={unsettledNetwork} 
                tabbyTotal={unsettledTabby}
                tamaraTotal={unsettledTamara}
              />
            ) : (
              <div className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 h-10 sm:h-9 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/30 animate-in zoom-in-95 duration-500 shadow-sm">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">{t('shiftClosed')}</span>
              </div>
            )
          )}

          {!isCashier && (
            <>
              <PDFDownloadLink
                document={
                  <SalesDocument sales={filteredSales}
                    totalCash={totalCash}
                    totalNetwork={totalNetwork}
                    totalCredit={totalCredit}
                    vatAmount={vatAmount}
                    manualProfit={manualProfit ? parseFloat(manualProfit) : autoProfit}
                    dateStr={`${fromDate} to ${toDate}`}
                    locale={locale}
                  />
                }
                fileName={`Sales_Report_Detailed_${fromDate}_to_${toDate}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading} className="w-full sm:w-auto h-10 sm:h-9 px-3 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
                    <Download size={14} className="shrink-0" />
                    <span className="truncate">{loading ? '…' : t('detailedPdf')}</span>
                  </Button>
                )}
              </PDFDownloadLink>
              <PDFDownloadLink
                document={
                  <SalesDocument sales={filteredSales}
                    totalCash={totalCash}
                    totalNetwork={totalNetwork}
                    totalCredit={totalCredit}
                    vatAmount={vatAmount}
                    manualProfit={manualProfit ? parseFloat(manualProfit) : autoProfit}
                    dateStr={`${fromDate} to ${toDate}`}
                    summaryOnly={true}
                    locale={locale}
                  />
                }
                fileName={`Sales_Report_Summary_${fromDate}_to_${toDate}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading} className="w-full sm:w-auto h-10 sm:h-9 px-3 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all">
                    <Download size={14} className="shrink-0" />
                    <span className="truncate">{loading ? '…' : t('summaryPdf')}</span>
                  </Button>
                )}
              </PDFDownloadLink>
            </>
          )}
        </div>
      </div>

      {/* ── Date filter + profit override (admin only) ── */}
      {!isCashier && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <Filter size={12} /> {t('from')}
            </Label>
            <Input
              type="date"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm shadow-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <Filter size={12} /> {t('toDate')}
            </Label>
            <Input
              type="date"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm shadow-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <Calculator size={12} /> {t('manualNetProfitOverride')}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Leave blank for auto"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm shadow-sm tabular-nums"
              value={manualProfit}
              onChange={(e) => setManualProfit(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Summary metric cards (admin only) ── */}
      {!isCashier && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: t('totalSales'), value: totalGrossRevenue, icon: <Receipt size={18} />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
            { label: t('netCash'), value: totalCash, icon: <Coins size={18} />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20', isNegative: totalCash < 0 },
            { label: t('netNetwork'), value: totalNetwork, icon: <CreditCard size={18} />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-500/20', isNegative: totalNetwork < 0 },
            { label: t('netCredit'), value: totalCredit, icon: <Users size={18} />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20', isNegative: totalCredit < 0 },
            { label: t('vat15'), value: vatAmount, icon: <TrendingDown size={18} />, color: 'text-orange-600 bg-orange-100 dark:bg-orange-500/20' },
            { 
              label: t('netProfit'), 
              value: manualProfit ? parseFloat(manualProfit) : autoProfit, 
              icon: <Calculator size={18} />, 
              color: 'text-rose-600 bg-rose-100 dark:bg-rose-500/20',
              isNegative: (manualProfit ? parseFloat(manualProfit) : autoProfit) < 0,
              sub: manualProfit ? t('manualOverride') : `${t('cost')}: ${totalCostOfSales.toFixed(2)}`
            },
          ].map((card, i) => (
            <Card key={i} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{card.label}</p>
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", card.color)}>
                    {card.icon}
                  </div>
                </div>
                <div>
                  <p className={cn("text-2xl font-black tabular-nums tracking-tight", card.isNegative ? 'text-red-500' : 'text-gray-900 dark:text-white')}>
                    {card.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-[10px] ml-1 font-bold text-gray-400 uppercase">sar</span>
                  </p>
                  {card.sub && (
                    <p className="text-[10px] text-gray-400 font-medium mt-1 truncate">{card.sub}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="space-y-6">
        
        {/* Modern Tab Switcher */}
        <div className="flex w-full">
          <div className="flex w-full items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'flex-1 py-2 sm:px-6 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2',
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              )}
            >
              <Receipt size={16} className="shrink-0 mb-0.5 sm:mb-0" />
              <span className="text-center leading-tight">{t('transactions')}</span>
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={cn(
                'flex-1 py-2 sm:px-6 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2',
                activeTab === 'credit'
                  ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
              )}
            >
              <Users size={16} className="shrink-0 mb-0.5 sm:mb-0" />
              <span className="text-center leading-tight">{t('unpaidCredit')}</span>
            </button>
            {canViewStats && (
              <button
                onClick={() => setActiveTab('performance')}
                className={cn(
                  'flex-1 py-2 sm:px-6 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2',
                  activeTab === 'performance'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                )}
              >
                <TrendingDown size={16} className="rotate-180 shrink-0 mb-0.5 sm:mb-0" />
                <span className="text-center leading-tight">{t('performance') || 'Performance'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'credit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <CreditCollectionPanel sales={isCashier ? (unpaidCreditSales || []) : sales} />
          </div>
        )}

        {activeTab === 'performance' && canViewStats && cashierPerformance && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto space-y-6">
            <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-900 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 dark:border-gray-800 p-4 gap-4 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">{t('staffPerformanceAndCommissions')}</h3>
                  <p className="text-xs text-gray-500">{t('trackMonthlySalesAndPayouts')}</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-xl shadow-sm">
                  <div className="ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 flex items-center text-gray-400">
                    <Percent size={14} />
                  </div>
                  <Input 
                    type="number" 
                    step="0.5"
                    className="w-20 h-8 border-none bg-transparent tabular-nums text-sm font-bold focus-visible:ring-0 px-0"
                    placeholder={t('rate')}
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
                  <div className="ltr:pr-3 rtl:pl-3 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('rate')}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-gray-100 dark:border-gray-800">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('salesperson')}</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">{t('today')}</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">{t('thisMonth')}</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-500">{t('estCommission')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashierPerformance.map((cashier, idx) => {
                      const commPercent = parseFloat(commissionRate) || 0;
                      const estCommission = (cashier.monthlySales * commPercent) / 100;
                      const isTopPerformer = idx === 0 && cashier.monthlySales > 0;
                      
                      // Calculate progress bar width based on the top performer's sales
                      const maxSales = Math.max(...cashierPerformance.map(c => c.monthlySales), 1);
                      const widthPercent = Math.min((cashier.monthlySales / maxSales) * 100, 100);

                      return (
                        <TableRow key={cashier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 group">
                          <TableCell className="font-bold py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-inner shrink-0 relative",
                                isTopPerformer ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                              )}>
                                {cashier.name.charAt(0)}
                                {isTopPerformer && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                                    <Crown size={10} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn("text-sm", isTopPerformer ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>{cashier.name}</span>
                                {isTopPerformer && <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">{t('topEarner')}</span>}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right tabular-nums">
                            <span className="font-semibold text-gray-600 dark:text-gray-400">
                              {cashier.dailySales.toFixed(2)}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                {cashier.monthlySales.toFixed(2)}
                              </span>
                              <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full rounded-full transition-all duration-1000", isTopPerformer ? "bg-amber-400" : "bg-blue-500")}
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/30 group-hover:scale-105 transition-transform">
                              <span className="font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                                {estCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600/50 uppercase">SAR</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 mt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('transactions')}</h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              {totalSales} sales
            </span>
            {totalRefunds > 0 && (
              <span className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {totalRefunds} refunds
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder={t('searchInvoiceOrDesc')}
              className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('type')}</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('invoiceNo')}</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('method')}</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('amount')} (SAR)</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('description')}</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('salesperson')}</TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">{t('reportDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map(sale => (
                  <TableRow
                    key={sale.id}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800',
                      sale.invoiceNumber && 'cursor-pointer',
                      sale.type === 'RETURN' && 'bg-rose-50/20 dark:bg-rose-500/5'
                    )}
                    onClick={() => sale.invoiceNumber && setSelectedInvoice(sale.invoiceNumber)}
                  >
                    <TableCell>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                        sale.isSettlement ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                        sale.type === 'SALE' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      )}>
                        {sale.isSettlement ? <CheckCircle size={14} /> : sale.type === 'SALE' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-gray-500">
                      {sale.invoiceNumber || `#${sale.id}`}
                    </TableCell>
                    <TableCell><MethodBadge sale={sale} /></TableCell>
                    <TableCell>
                      <span className={cn('font-bold tabular-nums text-sm', sale.type === 'RETURN' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white')}>
                        {sale.type === 'RETURN' ? '-' : '+'}{sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {sale.methods.has('CASH') && sale.methods.has('NETWORK') && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Cash: {sale.cashAmount.toFixed(2)} | Net: {sale.networkAmount.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                          {sale.description || (sale.type === 'SALE' ? 'Sale' : sale.type === 'RETURN' ? 'Return' : 'Payment')}
                        </span>
                        {(sale.customerName || sale.customerPhone) && (
                          <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mt-0.5">
                            {sale.customerName || t('noName')} · {sale.customerPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-gray-600 uppercase whitespace-nowrap">
                      {sale.salesperson}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap font-medium tabular-nums">{format(new Date(sale.createdAt), 'MMM d, h:mm a')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedSales.map(sale => (
              <div
                key={sale.id}
                className={cn(
                  'flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors',
                  sale.invoiceNumber && 'cursor-pointer',
                  sale.type === 'RETURN' && 'bg-rose-50/20 dark:bg-rose-900/5'
                )}
                onClick={() => sale.invoiceNumber && setSelectedInvoice(sale.invoiceNumber)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    sale.isSettlement ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    sale.type === 'SALE' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {sale.isSettlement ? <CheckCircle size={18} /> : sale.type === 'SALE' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>
                  
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {sale.description || (sale.type === 'SALE' ? 'Sale' : sale.type === 'RETURN' ? 'Return' : 'Payment')}
                      </p>
                      <MethodBadge sale={sale} />
                    </div>
                    <p className="text-xs font-mono text-gray-400 truncate">
                      {sale.invoiceNumber || `#${sale.id}`} • {sale.salesperson}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0 pl-3">
                  <p className={cn(
                    "text-sm font-bold tabular-nums",
                    sale.type === 'SALE' || sale.isSettlement ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {sale.type === 'RETURN' ? '-' : '+'}{sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <span className="text-[10px] ml-1 font-semibold text-gray-400 uppercase">SAR</span>
                  </p>
                  <p className="text-[11px] font-medium text-gray-400 tabular-nums mt-0.5">
                    {format(new Date(sale.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {aggregatedSales.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">{t('noSalesYet')}</p>
            </div>
          )}

          {/* Pagination Controls */}
          {aggregatedSales.length > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Showing <span className="font-bold text-gray-900 dark:text-white">{startIndex + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{endIndex}</span> of <span className="font-bold text-gray-900 dark:text-white">{aggregatedSales.length}</span> transactions
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} />
                </Button>
                
                <div className="flex items-center gap-1 px-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{currentPage}</span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs font-medium text-gray-500">{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
          </div>
        </div>
      )}
      
      <ViewInvoiceModal
        invoiceNumber={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      />
      </div>
    </div>
  )
}
