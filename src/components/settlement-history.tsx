'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import { getSettlementDetails } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'
import { cn } from '@/lib/utils'

export function SettlementHistory({ initialSettlements }: { initialSettlements: any[] }) {
  const { locale, t } = useLanguage();
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const handleDownload = async (settlementId: number) => {
    setLoadingId(settlementId)
    try {
      const data = await getSettlementDetails(settlementId)
      if (!data) return

      // Sanitize transactions into plain POJOs — same reason as settle-cash-btn.tsx:
      // @react-pdf/renderer crashes on nested Prisma relation objects in props.
      const sanitizedTransactions = (data.transactions || []).map((tx: any) => ({
        id: tx?.id ?? null,
        type: tx?.type ?? null,
        method: tx?.method ?? null,
        amount: tx?.amount ?? 0,
        description: tx?.description ?? null,
        createdAt: tx?.createdAt ? new Date(tx.createdAt).toISOString() : null,
        isInternal: tx?.isInternal ?? false,
        isSettled: tx?.isSettled ?? false,
      }));

      const blob = await pdf(<SettlementDocument settlement={data} transactions={sanitizedTransactions} locale={locale} />).toBlob()
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
    <div className="bg-white dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-gray-50 dark:border-gray-800">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 py-4 pl-6">Date</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 py-4 hidden sm:table-cell">Cashier</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 py-4 text-right">Amount</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 py-4 text-right pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialSettlements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                {t('noSettlements')}
              </TableCell>
            </TableRow>
          ) : (
            initialSettlements.map((s) => {
              if (!s) return null;
              const discrepancy = (s.actualCashCounted || 0) - (s.totalCashHanded || 0)
              return (
                <TableRow key={s.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/40 border-gray-50 dark:border-gray-800 transition-colors">
                  <TableCell className="py-3 pl-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-none">
                        {format(new Date(s.reportDate), 'MMM d, yyyy')}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                        {format(new Date(s.reportDate), 'h:mm a')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 hidden sm:table-cell">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      {s.performedBy?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums">
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {s.actualCashCounted?.toLocaleString() || s.totalCashHanded.toLocaleString()}
                    </span>
                    <span className="text-[9px] ml-1 font-bold text-gray-400 uppercase tracking-tighter">sar</span>
                  </TableCell>
                  <TableCell className="py-3 text-right pr-6">
                    <div className="flex items-center justify-end gap-3">
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                        discrepancy === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {discrepancy === 0 ? "Balanced" : (discrepancy > 0 ? "+" : "") + discrepancy.toFixed(0)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => handleDownload(s.id)}
                        disabled={loadingId === s.id}
                      >
                        {loadingId === s.id ? (
                          <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        ) : (
                          <FileDown size={14} />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
