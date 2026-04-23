'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/providers/language-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { Receipt, Coins, CreditCard, Download, Filter, Calculator } from 'lucide-react'
import { AddSalesModal } from '@/components/add-sales-modal'
import { AddRefundModal } from '@/components/add-refund-modal'
import { SalesDocument } from '@/components/sales-document'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SalesPage({
  initialSales
}: {
  initialSales?: any[]
}) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isCashier = session?.user?.role === 'CASHIER'
  const [sales, setSales] = useState<any[]>(initialSales || [])
  const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [manualProfit, setManualProfit] = useState<string>('')

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt)
    const start = new Date(fromDate)
    start.setHours(0,0,0,0)
    const end = new Date(toDate)
    end.setHours(23,59,59,999)
    return isWithinInterval(saleDate, { start, end })
  })

  // Calculate metrics
  let totalCash = 0
  let totalNetwork = 0

  // Group sales for display
  const groups = new Map<string, any>()
  
  filteredSales.forEach(sale => {
    // Process metrics
    if (sale.type === 'SALE') {
      if (sale.method === 'CASH') totalCash += sale.amount
      if (sale.method === 'NETWORK') totalNetwork += sale.amount
    } else if (sale.type === 'RETURN') {
      if (sale.method === 'CASH') totalCash -= sale.amount
      if (sale.method === 'NETWORK') totalNetwork -= sale.amount
    }

    // Grouping strictly by exact ISO timestamp string and cashier ID guarantees split records
    const key = `${sale.createdAt}_${sale.recordedById}_${sale.type}`
    if (!groups.has(key)) {
      groups.set(key, {
        id: sale.id,
        type: sale.type,
        description: sale.description,
        createdAt: sale.createdAt,
        totalAmount: 0,
        cashAmount: 0,
        networkAmount: 0,
        methods: new Set()
      })
    }
    const g = groups.get(key)
    g.totalAmount += sale.amount
    if (sale.method === 'CASH') g.cashAmount += sale.amount
    if (sale.method === 'NETWORK') g.networkAmount += sale.amount
    g.methods.add(sale.method)
  })

  // Export grouped structure ordered by recency
  const aggregatedSales = Array.from(groups.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{t('salesReport')}</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">{t('salesSubtitle')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <AddSalesModal triggerClassName="flex-1 sm:flex-none h-10 px-4" />
          <AddRefundModal triggerClassName="flex-1 sm:flex-none h-10 px-4" />
          
          {!isCashier && (
            <div className="w-full sm:w-auto">
              <PDFDownloadLink
                document={
                  <SalesDocument 
                    sales={filteredSales} 
                    totalCash={totalCash} 
                    totalNetwork={totalNetwork} 
                    vatAmount={(totalCash + totalNetwork) * 0.15}
                    manualProfit={parseFloat(manualProfit) || 0}
                    dateStr={`${fromDate} to ${toDate}`}
                  />
                }
                fileName={`Sales_Report_${fromDate}_to_${toDate}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading} className="w-full sm:w-auto gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 shadow-sm h-10">
                    <Download size={16} />
                    {loading ? '...' : t('generatePdf')}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </div>
      </div>

      {!isCashier && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 ring-1 ring-gray-200 dark:ring-gray-800">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                  <Filter size={14} /> From Date
                </Label>
                <Input 
                  type="date" 
                  className="rounded-xl border-gray-200 focus:ring-emerald-500" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                  <Filter size={14} /> To Date
                </Label>
                <Input 
                  type="date" 
                  className="rounded-xl border-gray-200 focus:ring-emerald-500" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                  <Calculator size={14} /> Manually Enter Net Profit
                </Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="e.g. 1500.00"
                  className="rounded-xl border-gray-200 focus:ring-emerald-500 font-bold" 
                  value={manualProfit} 
                  onChange={(e) => setManualProfit(e.target.value)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCashier && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md border-none bg-white dark:bg-gray-900 border-l-4 border-l-blue-500 overflow-hidden relative group transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 p-1 opacity-5">
              <Coins size={60} />
            </div>
            <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
              <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg">
                <Coins size={18} />
              </div>
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Net Cash Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">{totalCash.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-white dark:bg-gray-900 border-l-4 border-l-purple-500 overflow-hidden relative group transition-all hover:shadow-lg">
             <div className="absolute top-0 right-0 p-1 opacity-5">
              <CreditCard size={60} />
            </div>
            <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
              <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 rounded-lg">
                <CreditCard size={18} />
              </div>
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Net Network Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-black text-purple-600 tabular-nums">{totalNetwork.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-white dark:bg-gray-900 border-l-4 border-l-orange-500 overflow-hidden relative group transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 p-1 opacity-5">
              <Receipt size={60} />
            </div>
            <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
              <div className="p-2 bg-orange-100 text-orange-600 dark:bg-orange-900/30 rounded-lg">
                <Receipt size={18} />
              </div>
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">VAT (15%)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-black text-orange-600 tabular-nums tracking-tighter">{((totalCash + totalNetwork) * 0.15).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-white dark:bg-gray-900 border-l-4 border-l-emerald-500 overflow-hidden relative group transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 p-1 opacity-5">
              <Calculator size={60} />
            </div>
            <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
              <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 rounded-lg">
                <Calculator size={18} />
              </div>
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-wider">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">{parseFloat(manualProfit).toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
              <TableRow>
                <TableHead className="whitespace-nowrap">{t('method')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('amount')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('description')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('reportDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedSales.map(sale => (
                <TableRow key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      sale.type === 'RETURN'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : sale.methods.has('CASH') && sale.methods.has('NETWORK')
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : sale.methods.has('CASH')
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {sale.type === 'RETURN' 
                        ? 'REFUND'
                        : sale.methods.has('CASH') && sale.methods.has('NETWORK') 
                          ? 'SPLIT' 
                          : sale.methods.has('CASH') ? t('cash') : t('network')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className={`font-bold whitespace-nowrap ${sale.type === 'RETURN' ? 'text-red-600' : ''}`}>
                      {sale.type === 'RETURN' ? '-' : ''}{sale.totalAmount.toFixed(2)}
                    </div>
                    {sale.methods.has('CASH') && sale.methods.has('NETWORK') && (
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 whitespace-nowrap" dir="ltr">
                        {t('cash')}: {sale.cashAmount.toFixed(2)} | {t('network')}: {sale.networkAmount.toFixed(2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] sm:max-w-[250px] truncate text-sm text-gray-500">{sale.description || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm text-gray-500">{format(new Date(sale.createdAt), 'PPp')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {aggregatedSales.map(sale => (
            <div key={sale.id} className="p-5 space-y-4 active:bg-gray-50 dark:active:bg-gray-900/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      sale.type === 'RETURN'
                        ? 'bg-red-500 text-white'
                        : sale.methods.has('CASH') && sale.methods.has('NETWORK')
                          ? 'bg-orange-500 text-white'
                          : sale.methods.has('CASH')
                            ? 'bg-blue-600 text-white'
                            : 'bg-purple-600 text-white'
                    }`}>
                      {sale.type === 'RETURN' ? 'Sales Return' : sale.methods.has('CASH') && sale.methods.has('NETWORK') ? 'Split Payment' : sale.methods.has('CASH') ? 'Cash Sale' : 'Network Sale'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                    <p className="text-[10px] uppercase tracking-tight">
                      {format(new Date(sale.createdAt), 'MMM dd, yyyy')}
                    </p>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <p className="text-[10px] uppercase tracking-tight">
                      {format(new Date(sale.createdAt), 'h:mm a')}
                    </p>
                  </div>
                </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black tabular-nums leading-none tracking-tight ${sale.type === 'RETURN' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                      {sale.type === 'RETURN' ? '-' : ''}{sale.totalAmount.toFixed(2)}
                    </p>
                  </div>
              </div>

              {sale.methods.has('CASH') && sale.methods.has('NETWORK') && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-2xl border border-blue-100 dark:border-blue-800/30 text-center">
                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">Cash</p>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-300 tabular-nums">{sale.cashAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2.5 rounded-2xl border border-purple-100 dark:border-purple-800/30 text-center">
                    <p className="text-[9px] text-purple-500 font-black uppercase tracking-widest mb-1">Network</p>
                    <p className="text-sm font-black text-purple-700 dark:text-purple-300 tabular-nums">{sale.networkAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 rounded-2xl flex items-center gap-3 border border-gray-100 dark:border-gray-800">
                <Receipt size={14} className="text-gray-400 shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium italic truncate">
                  {sale.description || 'No notes provided for this transaction'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {aggregatedSales.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt size={32} className="text-emerald-300" />
            </div>
            <p className="text-gray-400 text-sm font-bold">{t('noSalesYet')}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
