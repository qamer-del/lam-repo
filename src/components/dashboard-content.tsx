'use client'

import { useEffect, useState } from 'react'
import { useStore, TransType, PayMethod, Transaction } from '@/store/useStore'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'
import { AddTransactionModal } from './add-transaction-modal'
import { SettleCashBtn } from './settle-cash-btn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SettlementHistory } from './settlement-history'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  DollarSign, 
  Wifi, 
  Users, 
  Receipt, 
  Landmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const ITEMS_PER_PAGE = 10

export function DashboardContent({ 
  initialData,
  userRole,
  inventorySummary,
}: { 
  initialData: { 
    cashInDrawer: number, 
    tabbyBalance: number,
    tamaraBalance: number,
    salaryFundRemaining: number, 
    totalOutstandingCredit: number,
    transactions: Transaction[],
    allStaffTransactions?: Transaction[],
    internalTransactions?: Transaction[],
    recentSettlements: any[]
  } 
  userRole?: string
  inventorySummary?: { totalValue: number; lowStockCount: number; outOfStockCount: number; totalItems: number } | null
}) {
  const { t } = useLanguage()
  const { cashInDrawer, networkSales, tabbyBalance, tamaraBalance, salaryFundRemaining, totalOutstandingCredit, transactions, setVaultData } = useStore()
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
  const isOwner = userRole === 'OWNER'
  const canViewStats = isAdmin || isOwner

  useEffect(() => {
    setVaultData(initialData)
  }, [initialData, setVaultData])

  const [currentPage, setCurrentPage] = useState(1)

  const internalTransactions = initialData.internalTransactions || []

  // Reset pagination when transactions list changes (e.g. new tx added)
  useEffect(() => {
    setCurrentPage(1)
  }, [transactions.length])

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, transactions.length)

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      SALE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      EXPENSE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      ADVANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      OWNER_WITHDRAWAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
      SALARY_PAYMENT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    }
    return map[type] || 'bg-gray-100 text-gray-700'
  }

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SALE: t('sale'),
      EXPENSE: t('expense'),
      ADVANCE: t('advance'),
      OWNER_WITHDRAWAL: t('ownerWithdrawal'),
      SALARY_PAYMENT: 'Salary Payment',
    }
    return map[type] || type
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('dashboard')}</h1>
        <p className="text-sm text-gray-500">Real-time financial overview</p>
      </div>

      {canViewStats && (
        <div className="space-y-6">
          {/* Top Row Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none bg-gradient-to-br from-emerald-600 to-emerald-400 text-white rounded-[24px] shadow-lg shadow-emerald-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={20} /></div>
                  <CardTitle className="text-sm font-bold opacity-90">{t('cashInDrawer')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black mt-4">
                  {cashInDrawer.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-medium ml-2 opacity-70">SAR</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-[24px] shadow-lg shadow-blue-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Wifi size={20} /></div>
                  <CardTitle className="text-sm font-bold opacity-90">{t('networkSales')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black mt-4">
                  {networkSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-medium ml-2 opacity-70">SAR</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-br from-violet-600 to-violet-400 text-white rounded-[24px] shadow-lg shadow-violet-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Receipt size={20} /></div>
                  <CardTitle className="text-sm font-bold opacity-90">Monthly Salary Reserves</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black mt-4">
                  {salaryFundRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-medium ml-2 opacity-70">SAR</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-br from-orange-500 to-amber-400 text-white rounded-[24px] shadow-lg shadow-orange-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Users size={20} /></div>
                  <CardTitle className="text-sm font-bold opacity-90">Outstanding Credit</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black mt-4">
                  {totalOutstandingCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-medium ml-2 opacity-70">SAR</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6">
            <Card className="border-none bg-gradient-to-br from-indigo-700 to-purple-600 text-white rounded-[24px] shadow-lg shadow-indigo-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Package size={20} /></div>
                  <CardTitle className="text-sm font-bold opacity-90">Tabby Account</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black mt-4">
                  {tabbyBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-medium ml-2 opacity-70">SAR</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-gradient-to-br from-pink-600 to-rose-500 text-white rounded-[24px] shadow-lg shadow-pink-500/20 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Package size={20} /></div>
                  <CardTitle className="text-sm font-bold opacity-90">Tamara Account</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black mt-4">
                  {tamaraBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-medium ml-2 opacity-70">SAR</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Action Buttons Area */}
      <div className="flex flex-wrap items-center justify-end gap-3 py-4">
        {!isOwner && (
          <>
            <AddTransactionModal triggerClassName="h-11 px-8 rounded-xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all flex items-center gap-2" />
            {isAdmin && (
              <SettleCashBtn triggerClassName="h-11 px-8 rounded-xl font-bold bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-all" />
            )}
            {isAdmin && tabbyBalance > 0 && (
              <Button 
                variant="outline"
                onClick={async () => {
                  if(confirm(`Settle Tabby?`)) {
                    const { settleTabbySales } = await import('@/actions/transactions') as any
                    await settleTabbySales()
                    useStore.getState().setVaultData({ tabbyBalance: 0 })
                  }
                }}
                className="h-11 px-6 rounded-xl font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                Settle Tabby
              </Button>
            )}
            {isAdmin && tamaraBalance > 0 && (
              <Button 
                variant="outline"
                onClick={async () => {
                  if(confirm(`Settle Tamara?`)) {
                    const { settleTamaraSales } = await import('@/actions/transactions') as any
                    await settleTamaraSales()
                    useStore.getState().setVaultData({ tamaraBalance: 0 })
                  }
                }}
                className="h-11 px-6 rounded-xl font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                Settle Tamara
              </Button>
            )}
          </>
        )}
      </div>

      {/* Transactions Table Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900 px-2">Recent Transactions</h3>
        <Card className="border-gray-200 rounded-[20px] overflow-hidden shadow-sm bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="border-b border-gray-100">
                <TableHead className="px-8 py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Type</TableHead>
                <TableHead className="py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Method</TableHead>
                <TableHead className="py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Amount</TableHead>
                <TableHead className="py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Description</TableHead>
                <TableHead className="py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Salesperson</TableHead>
                <TableHead className="py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Report Date</TableHead>
                <TableHead className="text-right px-8 py-4 font-bold text-gray-500 uppercase text-[11px] tracking-wider">Settled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => (
                <TableRow key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="px-8 py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold", getTypeBadge(tx.type))}>
                      {getTypeLabel(tx.type)}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 font-medium text-gray-600">{tx.method}</TableCell>
                  <TableCell className="py-4 font-black text-gray-900">{tx.amount.toFixed(2)}</TableCell>
                  <TableCell className="py-4 text-gray-500 italic max-w-[200px] truncate">{tx.description || '-'}</TableCell>
                  <TableCell className="py-4 font-bold text-slate-700">{tx.recordedBy?.name || '-'}</TableCell>
                  <TableCell className="py-4 text-gray-400 text-xs">{format(new Date(tx.createdAt), 'MMM d, yyyy, h:mm a')}</TableCell>
                  <TableCell className="text-right px-8 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-medium uppercase tracking-tighter">Settled</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transactions.length === 0 && (
            <div className="py-20 text-center text-gray-400">No transactions found</div>
          )}
        </Card>
      </div>

      {/* History Layer */}
      {canViewStats && (
        <div className="pt-10 border-t border-gray-100">
           <SettlementHistory initialSettlements={initialData.recentSettlements} />
        </div>
      )}
    </div>
  )
}
