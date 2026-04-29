'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/providers/language-provider'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { Receipt, Coins, CreditCard, Download, Filter, Calculator, TrendingDown, ArrowUpRight, ArrowDownLeft, Users } from 'lucide-react'
import { AddSalesModal } from '@/components/add-sales-modal'
import { AddRefundModal } from '@/components/add-refund-modal'
import { SettleCashBtn } from '@/components/settle-cash-btn'
import { ViewInvoiceModal } from '@/components/view-invoice-modal'
import { CreditSalesTable } from '@/components/credit-sales-table'
import { SalesDocument } from '@/components/sales-document'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function SalesPage({
  initialSales,
  initialMovements,
}: {
  initialSales?: any[]
  initialMovements?: any[]
}) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isCashier = session?.user?.role === 'CASHIER'

  const [sales] = useState<any[]>(initialSales || [])
  const [movements] = useState<any[]>(initialMovements || [])
  const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [toDate, setToDate]     = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [manualProfit, setManualProfit] = useState<string>('')
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const groups = new Map<string, any>()

  filteredSales.forEach(sale => {
    const isNetworkLike = ['NETWORK', 'TABBY', 'TAMARA'].includes(sale.method)
    const isCredit = sale.method === 'CREDIT'

    if (sale.type === 'SALE') {
      if (sale.method === 'CASH') totalCash    += sale.amount
      if (isNetworkLike)          totalNetwork += sale.amount
    } else if (sale.type === 'RETURN') {
      if (sale.method === 'CASH') totalCash    -= sale.amount
      if (isNetworkLike)          totalNetwork -= sale.amount
    }

    const key = sale.invoiceNumber || `${sale.createdAt}_${sale.recordedById}_${sale.type}`
    if (!groups.has(key)) {
      groups.set(key, {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        type: sale.type,
        description: sale.description,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        createdAt: sale.createdAt,
        totalAmount: 0,
        cashAmount: 0,
        networkAmount: 0,
        methods: new Set<string>(),
      })
    }
    const g = groups.get(key)!
    g.totalAmount += sale.amount
    if (sale.method === 'CASH') g.cashAmount += sale.amount
    if (isNetworkLike)          g.networkAmount += sale.amount
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

  const autoProfit = totalCash + totalNetwork - totalCostOfSales

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
          <AddRefundModal triggerClassName="flex-1 sm:flex-none h-9 px-4 text-sm" />
          <SettleCashBtn triggerClassName="flex-1 sm:flex-none h-9 px-4 text-sm bg-gray-900 text-white" />

          {!isCashier && (
            <PDFDownloadLink
              document={
                <SalesDocument
                  sales={filteredSales}
                  totalCash={totalCash}
                  totalNetwork={totalNetwork}
                  vatAmount={(totalCash + totalNetwork) * 0.15}
                  manualProfit={manualProfit ? parseFloat(manualProfit) : autoProfit}
                  dateStr={`${fromDate} to ${toDate}`}
                />
              }
              fileName={`Sales_Report_${fromDate}_to_${toDate}.pdf`}
            >
              {({ loading }) => (
                <Button variant="outline" disabled={loading} className="flex-1 sm:flex-none h-9 px-4 text-sm gap-2 border-gray-300 hover:bg-gray-50">
                  <Download size={14} />
                  {loading ? '…' : t('generatePdf')}
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {/* ── Date filter + profit override (admin only) ── */}
      {!isCashier && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Filter size={12} /> From
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
              <Filter size={12} /> To
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
              <Calculator size={12} /> Manual Net Profit Override
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Total Sales */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Receipt size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Sales</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-black text-emerald-600 tabular-nums">{(totalCash + totalNetwork).toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* Net Cash */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Coins size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Net Cash</CardTitle>
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
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Net Network</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={cn('text-xl font-black tabular-nums', totalNetwork < 0 ? 'text-red-500' : 'text-purple-600')}>{totalNetwork.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* VAT */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><TrendingDown size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">VAT 15%</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-black text-orange-600 tabular-nums">{((totalCash + totalNetwork) * 0.15).toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">SAR</p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Calculator size={14} /></div>
              <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Net Profit</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={cn('text-xl font-black tabular-nums', (manualProfit ? parseFloat(manualProfit) : autoProfit) < 0 ? 'text-red-500' : 'text-emerald-600')}>
                {(manualProfit ? parseFloat(manualProfit) : autoProfit).toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {manualProfit ? 'Manual override' : `Cost: ${totalCostOfSales.toFixed(2)} SAR`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Credit Tracking (Only for Admins) */}
        {!isCashier && (
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600">
                <Users size={18} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white font-cairo">Unpaid Credit</h2>
            </div>
            <CreditSalesTable sales={sales} />
          </div>
        )}

        {/* Right Column: Transactions table ── */}
        <div className={cn("space-y-4", !isCashier ? "lg:col-span-8" : "lg:col-span-12")}>
          <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 font-cairo">Transactions</h2>
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
              placeholder="Search invoice or description…"
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
                  <TableHead className="whitespace-nowrap text-xs">Type</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">Invoice No.</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">Method</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">Amount (SAR)</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('description')}</TableHead>
                  <TableHead className="whitespace-nowrap text-xs">{t('reportDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedSales.map(sale => (
                  <TableRow
                    key={sale.id}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800/40 transition',
                      sale.invoiceNumber && 'cursor-pointer',
                      sale.type === 'RETURN' && 'bg-red-50/30 dark:bg-red-900/5'
                    )}
                    onClick={() => sale.invoiceNumber && setSelectedInvoice(sale.invoiceNumber)}
                  >
                    {/* Type badge */}
                    <TableCell>
                      {sale.type === 'SALE' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase">
                          <ArrowUpRight size={12} className="text-emerald-500" /> Sale
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 uppercase">
                          <ArrowDownLeft size={12} className="text-red-500" /> Refund
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
                            {sale.customerName || 'No Name'} · {sale.customerPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{format(new Date(sale.createdAt), 'PP · p')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {aggregatedSales.map(sale => (
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
                      {/* Sale/Refund type indicator */}
                      {sale.type === 'RETURN' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                          <ArrowDownLeft size={10} /> Refund
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                          <ArrowUpRight size={10} /> Sale
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
                      <p className="text-[10px] text-emerald-600 font-semibold uppercase">Cash</p>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">{sale.cashAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg text-center">
                      <p className="text-[10px] text-blue-600 font-semibold uppercase">Network</p>
                      <p className="text-sm font-bold text-blue-700 tabular-nums">{sale.networkAmount.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {(sale.customerName || sale.customerPhone) && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/5 dark:bg-amber-500/10 rounded-lg border border-amber-200/20">
                    <Users size={12} className="text-amber-600" />
                    <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                      {sale.customerName || 'No Name'} · {sale.customerPhone}
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
        </Card>
      </div>

        <ViewInvoiceModal
          invoiceNumber={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
        />
      </div>
    </div>
  </div>
)
}
