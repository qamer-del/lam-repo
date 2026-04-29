'use client'

import { useEffect, useState } from 'react'
import { useStore, TransType, PayMethod } from '@/store/useStore'
export interface Transaction {
  id: number
  type: TransType
  amount: number
  method: PayMethod
  description: string | null
  isSettled: boolean
  createdAt: Date
  staffId: number | null
  agentId: number | null
  settlementId: number | null
  salarySettlementId: number | null
  recordedById: string | null
  isInternal: boolean
  staff?: { name: string } | null
  agent?: { name: string } | null
}
import { useLanguage } from '@/providers/language-provider'
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
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const ITEMS_PER_PAGE = 10

export function DashboardContent({ 
  initialData,
  userRole,
  inventorySummary
}: { 
  initialData: { 
    cashInDrawer: number, 
    networkSales: number, 
    salaryFundRemaining: number, 
    transactions: Transaction[],
    allStaffTransactions?: Transaction[],
    internalTransactions?: Transaction[],
    recentSettlements: any[]
  } 
  userRole?: string
  inventorySummary?: { totalValue: number; lowStockCount: number; outOfStockCount: number; totalItems: number } | null
}) {
  const { t } = useLanguage()
  const { cashInDrawer, networkSales, salaryFundRemaining, totalOutstandingCredit, transactions, setVaultData } = useStore()
  
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
          <p className="text-gray-500 mt-1 text-sm">Real-time financial overview</p>
        </div>
      </div>

      {/* Stats Cards - Hidden for Cashiers */}
      {canViewStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign size={20} />
              </div>
              <CardTitle className="text-sm font-medium opacity-90">{t('cashInDrawer')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{cashInDrawer.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wifi size={20} />
              </div>
              <CardTitle className="text-sm font-medium opacity-90">{t('networkSales')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{networkSales.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Receipt size={20} />
              </div>
              <CardTitle className="text-sm font-medium opacity-90">Monthly Salary Reserves</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{salaryFundRemaining.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users size={20} />
              </div>
              <CardTitle className="text-sm font-medium opacity-90">Outstanding Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{totalOutstandingCredit.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Low-Stock Alert Card */}
      {canViewStats && inventorySummary && (inventorySummary.lowStockCount > 0 || inventorySummary.outOfStockCount > 0) && (
        <Link href="/inventory">
          <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition cursor-pointer">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertTriangle size={22} />
            </div>
            <div className="flex-1">
              <p className="font-black text-amber-800 dark:text-amber-300">Inventory Alert</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {inventorySummary.outOfStockCount > 0 && <span className="font-bold">{inventorySummary.outOfStockCount} out of stock</span>}
                {inventorySummary.outOfStockCount > 0 && inventorySummary.lowStockCount > 0 && ' · '}
                {inventorySummary.lowStockCount > 0 && <span>{inventorySummary.lowStockCount} low stock</span>}
              </p>
            </div>
            <Package size={18} className="text-amber-400" />
          </div>
        </Link>
      )}

      {/* Actions */}
      {!isOwner && (
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <AddTransactionModal triggerClassName="flex-1 sm:flex-none h-11 sm:h-10 px-6 font-bold" />
          {isAdmin && (
            <SettleCashBtn triggerClassName="flex-1 sm:flex-none h-11 sm:h-10 px-6 font-bold" />
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        <CardHeader className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-lg">{t('recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead className="whitespace-nowrap">{t('type')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('method')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('amount')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('description')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('reportDate')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('settled')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadge(tx.type)}`}>
                        {getTypeLabel(tx.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.method === 'CASH' ? t('cash') : t('network')}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{tx.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-gray-500 text-sm max-w-[200px] truncate">{tx.description || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{format(new Date(tx.createdAt), 'PPp')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (tx.isSettled || tx.settlementId) 
                          ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {(tx.isSettled || tx.settlementId) ? t('settled') : t('unsettled')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedTransactions.map((tx) => (
              <div key={tx.id} className="p-4 space-y-3 active:bg-gray-50 dark:active:bg-gray-900 transition">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${getTypeBadge(tx.type)}`}>
                      {getTypeLabel(tx.type)}
                    </span>
                    <p className="text-xs text-gray-400 font-medium">{format(new Date(tx.createdAt), 'MMM dd, h:mm a')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                      {tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {tx.method === 'CASH' ? t('cash') : t('network')}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1 pr-4">
                    {tx.description || <span className="italic opacity-50">{t('noDescription') || 'No description'}</span>}
                  </p>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    (tx.isSettled || tx.settlementId)
                      ? 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {(tx.isSettled || tx.settlementId) ? t('settled') : t('unsettled')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="text-gray-300" size={32} />
              </div>
              <p className="text-gray-400 text-sm font-medium">No transactions yet.</p>
              <p className="text-gray-500 text-xs mt-1">Transactions will appear here once added.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {transactions.length > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Showing <span className="font-bold text-gray-900 dark:text-white">{startIndex + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{endIndex}</span> of <span className="font-bold text-gray-900 dark:text-white">{transactions.length}</span> transactions
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
        </CardContent>
      </Card>

      {/* Separate Account (Internal Adjustments) - SUPER ADMIN ONLY */}
      {isSuperAdmin && internalTransactions.length > 0 && (
        <Card className="border-2 border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden bg-gray-50/50 dark:bg-black/20">
          <CardHeader className="bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 text-white rounded-lg">
                <Landmark size={20} />
              </div>
              <div>
                <CardTitle className="text-lg">Internal Corrections Ledger</CardTitle>
                <p className="text-xs text-gray-500">Separated adjustments account (Super Admin Only)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100/50 dark:bg-gray-800/30">
                    <TableHead className="text-xs uppercase font-black tracking-widest opacity-50">Correction #</TableHead>
                    <TableHead className="text-xs uppercase font-black tracking-widest opacity-50">Impacted Account</TableHead>
                    <TableHead className="text-xs uppercase font-black tracking-widest opacity-50">Final Amount</TableHead>
                    <TableHead className="text-xs uppercase font-black tracking-widest opacity-50">Modified Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalTransactions.map(tx => (
                    <TableRow key={tx.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition border-gray-100 dark:border-gray-800">
                      <TableCell className="font-bold text-gray-900 dark:text-gray-100">#{tx.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{tx.staff?.name || 'General'}</span>
                          <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase font-black opacity-60">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-blue-600 dark:text-blue-400 tabular-nums">{tx.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-gray-500 font-medium">{format(new Date(tx.createdAt), 'PPp')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement History Section */}
      {canViewStats && (
        <SettlementHistory initialSettlements={initialData.recentSettlements} />
      )}
    </div>
  )
}
