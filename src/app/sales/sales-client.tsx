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
import { format } from 'date-fns'
import { Receipt, Coins, CreditCard, Download } from 'lucide-react'
import { AddSalesModal } from '@/components/add-sales-modal'
import { SalesDocument } from '@/components/sales-document'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'

export default function SalesPage({
  initialSales
}: {
  initialSales?: any[]
}) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const isCashier = session?.user?.role === 'CASHIER'
  const [sales, setSales] = useState<any[]>(initialSales || [])

  // Auto fetch would normally go here if not injected by SSR wrapping
  // However, since we injected using a page wrapper similar to dashboard, we can just use props.

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // Calculate metrics
  let totalCash = 0
  let totalNetwork = 0

  // Group sales for display
  const groups = new Map<string, any>()
  
  sales.forEach(sale => {
    // Process metrics
    const d = new Date(sale.createdAt)
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
       if (sale.method === 'CASH') totalCash += sale.amount
       if (sale.method === 'NETWORK') totalNetwork += sale.amount
    }

    // Grouping strictly by exact ISO timestamp string and cashier ID guarantees split records
    const key = `${sale.createdAt}_${sale.recordedById}`
    if (!groups.has(key)) {
      groups.set(key, {
        id: sale.id,
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
        
        <div className="flex w-full sm:w-auto gap-3">
          <AddSalesModal />
          
          {!isCashier && (
            <PDFDownloadLink
              document={<SalesDocument sales={sales} totalCash={totalCash} totalNetwork={totalNetwork} />}
              fileName={`Sales_Report_${format(new Date(), 'MMM_dd_yyyy')}.pdf`}
            >
              {({ loading }) => (
                <Button variant="outline" disabled={loading} className="flex-1 sm:flex-none gap-2">
                  <Download size={16} />
                  {loading ? '...' : t('generatePdf')}
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {!isCashier && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md border-none bg-white dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 rounded-lg">
                <Receipt size={20} />
              </div>
              <CardTitle className="text-sm font-medium text-gray-500">{t('grossTotalMonth')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{(totalCash + totalNetwork).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-white dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg">
                <Coins size={20} />
              </div>
              <CardTitle className="text-sm font-medium text-gray-500">{t('cashVolume')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">{totalCash.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-white dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800 sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 rounded-lg">
                <CreditCard size={20} />
              </div>
              <CardTitle className="text-sm font-medium text-gray-500">{t('networkVolume')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">{totalNetwork.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
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
                      sale.methods.has('CASH') && sale.methods.has('NETWORK')
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : sale.methods.has('CASH')
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {sale.methods.has('CASH') && sale.methods.has('NETWORK') 
                        ? 'SPLIT' 
                        : sale.methods.has('CASH') ? t('cash') : t('network')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold whitespace-nowrap">{sale.totalAmount.toFixed(2)}</div>
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
              {aggregatedSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                    {t('noSalesYet')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
