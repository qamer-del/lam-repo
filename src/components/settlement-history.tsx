'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileDown, History, Printer, Eye } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { getSettlementDetails } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'

export function SettlementHistory({ initialSettlements }: { initialSettlements: any[] }) {
  const { t } = useLanguage()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const handleDownload = async (settlementId: number) => {
    setLoadingId(settlementId)
    try {
      const data = await getSettlementDetails(settlementId)
      if (!data) return

      const blob = await pdf(<SettlementDocument settlement={data} transactions={data.transactions} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `settlement-${settlementId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <History size={18} />
            </div>
            <CardTitle className="text-xl font-black">{t('settlementHistory')}</CardTitle>
          </div>
          <CardDescription>{t('viewPreviousReports')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/30 dark:bg-gray-900/20">
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">ID</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">{t('reportDate')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">{t('expectedCash')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">{t('actualCount')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">{t('discrepancy')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">{t('networkVolume')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400">{t('performedBy')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-right">{t('grossTotalMonth')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-gray-400 font-medium">
                    {t('noSettlements')}
                  </TableCell>
                </TableRow>
              ) : (
                initialSettlements.map((s) => {
                  const discrepancy = (s.actualCashCounted || 0) - s.totalCashHanded
                  return (
                    <TableRow key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition border-gray-100 dark:border-gray-800">
                      <TableCell className="font-black text-gray-400">#{s.id}</TableCell>
                      <TableCell className="text-sm font-bold text-gray-600 dark:text-gray-300">
                        {format(new Date(s.reportDate), 'PPp')}
                      </TableCell>
                      <TableCell className="font-black tabular-nums">
                        {s.totalCashHanded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-black tabular-nums text-blue-600 dark:text-blue-400">
                        {s.actualCashCounted?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 'N/A'}
                      </TableCell>
                      <TableCell className={`font-black tabular-nums ${discrepancy < 0 ? 'text-red-500' : discrepancy > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {discrepancy === 0 ? '0.00' : (discrepancy > 0 ? '+' : '') + discrepancy.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {s.totalNetworkVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {s.performedBy?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 font-bold rounded-xl"
                          onClick={() => handleDownload(s.id)}
                          disabled={loadingId === s.id}
                        >
                          {loadingId === s.id ? (
                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          ) : (
                            <FileDown size={14} />
                          )}
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
