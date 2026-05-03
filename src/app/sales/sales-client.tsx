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
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
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
}: {
  initialSales?: any[]
  initialMovements?: any[]
  userRole?: string
  unpaidCreditSales?: any[] | null
}) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isCashier = userRole === 'CASHIER' || session?.user?.role === 'CASHIER'

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
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'transactions' | 'credit'>('transactions')
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">{t('salesReport')}</h1>
          <p className="text-gray-500 mt-0.5 text-sm font-cairo">{t('salesSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <AddSalesModal triggerClassName="flex-1 sm:flex-none h-9 px-4 text-sm" />
          {!isCashier && (
            <>
              <AddRefundModal triggerClassName="flex-1 sm:flex-none h-9 px-4 text-sm" />
            </>
          )}
          {isCashier && (
            hasUnsettled ? (
              <CloseShiftBtn 
                triggerClassName="flex-1 sm:flex-none h-9 px-4 text-sm animate-in fade-in duration-500" 
                cashTotal={unsettledCash} 
                networkTotal={unsettledNetwork} 
                tabbyTotal={unsettledTabby}
                tamaraTotal={unsettledTamara}
              />
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800 animate-in zoom-in-95 duration-500 shadow-sm">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-wider">{t('shiftClosed')}</span>
              </div>
            )
          )}

          {!isCashier && (
            <>
              <PDFDownloadLink
                document={
                  <SalesDocument
                    sales={filteredSales}
                    totalCash={totalCash}
                    totalNetwork={totalNetwork}
                    totalCredit={totalCredit}
                    vatAmount={vatAmount}
                    manualProfit={manualProfit ? parseFloat(manualProfit) : autoProfit}
                    dateStr={`${fromDate} to ${toDate}`}
                  />
                }
                fileName={`Sales_Report_Detailed_${fromDate}_to_${toDate}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading} className="flex-1 sm:flex-none h-9 px-4 text-sm gap-2 border-gray-300 hover:bg-gray-50">
                    <Download size={14} />
                    {loading ? '…' : t('detailedPdf')}
                  </Button>
                )}
              </PDFDownloadLink>
              <PDFDownloadLink
                document={
                  <SalesDocument
                    sales={filteredSales}
                    totalCash={totalCash}
                    totalNetwork={totalNetwork}
                    totalCredit={totalCredit}
                    vatAmount={vatAmount}
                    manualProfit={manualProfit ? parseFloat(manualProfit) : autoProfit}
                    dateStr={`${fromDate} to ${toDate}`}
                    summaryOnly={true}
                  />
                }
                fileName={`Sales_Report_Summary_${fromDate}_to_${toDate}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading} className="flex-1 sm:flex-none h-9 px-4 text-sm gap-2 border-gray-300 hover:bg-gray-50">
                    <Download size={14} />
                    {loading ? '…' : t('summaryPdf')}
                  </Button>
                )}
              </PDFDownloadLink>
            </>
          )}
        </div>
      </div>

      {/* ── Date filter + profit override (admin only) ── */}
      {!isCashier && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Filter size={12} /> {t('from')}
            </Label>
            <Input
              type="date"
              className="h-9 rounded-lg border-gray-200 dark:border-gray-700 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Filter size={12} /> {t('toDate')}
            </Label>
            <Input
              type="date"
              className="h-9 rounded-lg border-gray-200 dark:border-gray-700 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Calculator size={12} /> {t('manualNetProfitOverride')}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Leave blank for auto"
              className="h-9 rounded-lg border-gray-200 dark:border-gray-700 text-sm tabular-nums"
              value={manualProfit}
              onChange={(e) => setManualProfit(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Summary metric cards (admin only) ── */}
      {!isCashier && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Sales */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Receipt size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('totalSales')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-black text-emerald-600 tabular-nums">{totalGrossRevenue.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* Net Cash */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Coins size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('netCash')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={cn('text-xl font-black tabular-nums', totalCash < 0 ? 'text-red-500' : 'text-blue-600')}>{totalCash.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* Net Network */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><CreditCard size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('netNetwork')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={cn('text-xl font-black tabular-nums', totalNetwork < 0 ? 'text-red-500' : 'text-purple-600')}>{totalNetwork.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Users size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('netCredit')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={cn('text-xl font-black tabular-nums', totalCredit < 0 ? 'text-red-500' : 'text-amber-600')}>{totalCredit.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* VAT */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><TrendingDown size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('vat15')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-black text-orange-600 tabular-nums">{vatAmount.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Calculator size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('netProfit')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={cn('text-xl font-black tabular-nums', (manualProfit ? parseFloat(manualProfit) : autoProfit) < 0 ? 'text-red-500' : 'text-emerald-600')}>
                {(manualProfit ? parseFloat(manualProfit) : autoProfit).toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {manualProfit ? t('manualOverride') : `${t('cost')}: ${totalCostOfSales.toFixed(2)} SAR`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div className="space-y-6">
        
        {/* Modern Tab Switcher */}
        <div className="flex justify-center sm:justify-start">
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-inner">
            <button
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2',
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Receipt size={16} />
              {t('transactions')}
            </button>
            <button
              onClick={() => setActiveTab('credit')}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2',
                activeTab === 'credit'
                  ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Users size={16} />
              {t('unpaidCredit')}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'credit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <CreditCollectionPanel sales={isCashier ? (unpaidCreditSales || []) : sales} />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 font-cairo">{t('transactions')}</h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              {totalSales} sales
            </span>
            {totalRefunds > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
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
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs">{t('type')}</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('invoiceNo')}</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('method')}</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('amount')} (SAR)</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('description')}</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('salesperson')}</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('reportDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map(sale => (
                  <TableRow
                    key={sale.id}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800/40 transition',
                      sale.invoiceNumber && 'cursor-pointer',
                      sale.type === 'RETURN' && 'bg-red-50/30 dark:bg-red-900/5'
                    )}
                    onClick={() => sale.invoiceNumber && setSelectedInvoice(sale.invoiceNumber)}
                  >
                    <TableCell>
                      {sale.isSettlement ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 uppercase">
                          <CheckCircle size={12} className="text-blue-500" /> Payment
                        </span>
                      ) : sale.type === 'SALE' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase">
                          <ArrowUpRight size={12} className="text-emerald-500" /> {t('sale')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 uppercase">
                          <ArrowDownLeft size={12} className="text-red-500" /> {t('refund')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {sale.invoiceNumber || `#${sale.id}`}
                    </TableCell>
                    <TableCell><MethodBadge sale={sale} /></TableCell>
                    <TableCell>
                      <span className={cn('font-bold tabular-nums text-sm', sale.type === 'RETURN' ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                        {sale.type === 'RETURN' ? '-' : ''}{sale.totalAmount.toFixed(2)}
                      </span>
                      {sale.methods.has('CASH') && sale.methods.has('NETWORK') && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Cash: {sale.cashAmount.toFixed(2)} | Net: {sale.networkAmount.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                          {sale.description || '—'}
                        </span>
                        {(sale.customerName || sale.customerPhone) && (
                          <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1">
                            {sale.customerName || t('noName')} · {sale.customerPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-gray-600 uppercase whitespace-nowrap">
                      {sale.salesperson}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{format(new Date(sale.createdAt), 'PP · p')}</TableCell>
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
                  'p-4 space-y-3 active:bg-gray-50 dark:active:bg-gray-900/50 transition-colors',
                  sale.invoiceNumber && 'cursor-pointer',
                  sale.type === 'RETURN' && 'bg-red-50/30 dark:bg-red-900/5'
                )}
                onClick={() => sale.invoiceNumber && setSelectedInvoice(sale.invoiceNumber)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Sale/Refund/Settlement type indicator */}
                      {sale.isSettlement ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Payment
                        </span>
                      ) : sale.type === 'RETURN' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                          <ArrowDownLeft size={10} /> {t('refund')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                          <ArrowUpRight size={10} /> {t('sale')}
                        </span>
                      )}
                      <MethodBadge sale={sale} />
                      <span className="text-xs font-mono text-gray-400">{sale.invoiceNumber || `#${sale.id}`}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">{format(new Date(sale.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                  </div>
                  <p className={cn('text-xl font-black tabular-nums', sale.type === 'RETURN' ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                    {sale.type === 'RETURN' ? '-' : ''}{sale.totalAmount.toFixed(2)}
                    <span className="text-xs font-normal text-gray-400 ml-1">SAR</span>
                  </p>
                </div>

                {sale.cashAmount > 0 && sale.networkAmount > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg text-center">
                      <p className="text-[10px] text-emerald-600 font-semibold uppercase">{t('cash')}</p>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">{sale.cashAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg text-center">
                      <p className="text-[10px] text-blue-600 font-semibold uppercase">{t('network')}</p>
                      <p className="text-sm font-bold text-blue-700 tabular-nums">{sale.networkAmount.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {(sale.customerName || sale.customerPhone) && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/5 dark:bg-amber-500/10 rounded-lg border border-amber-200/20">
                    <Users size={12} className="text-amber-600" />
                    <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                      {sale.customerName || t('noName')} · {sale.customerPhone}
                    </p>
                  </div>
                )}

                {sale.description && (
                  <p className="text-xs text-gray-500 italic truncate">{sale.description}</p>
                )}
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
