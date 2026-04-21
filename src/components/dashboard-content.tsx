'use client'

import { useEffect } from 'react'
import { useStore, Transaction } from '@/store/useStore'
import { useLanguage } from '@/providers/language-provider'
import { AddTransactionModal } from './add-transaction-modal'
import { SettleCashBtn } from './settle-cash-btn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, Wifi, Users } from 'lucide-react'
import { format } from 'date-fns'

export function DashboardContent({ 
  initialData,
  userRole
}: { 
  initialData: { cashInDrawer: number, networkSales: number, totalStaffDebt: number, transactions: Transaction[] } 
  userRole?: string
}) {
  const { t } = useLanguage()
  const { cashInDrawer, networkSales, totalStaffDebt, transactions, setVaultData } = useStore()
  
  const isAdmin = userRole === 'ADMIN'

  useEffect(() => {
    setVaultData(initialData)
  }, [initialData, setVaultData])

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      SALE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      EXPENSE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      ADVANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      OWNER_WITHDRAWAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    }
    return map[type] || 'bg-gray-100 text-gray-700'
  }

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SALE: t('sale'),
      EXPENSE: t('expense'),
      ADVANCE: t('advance'),
      OWNER_WITHDRAWAL: t('ownerWithdrawal'),
    }
    return map[type] || type
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
        <p className="text-gray-500 mt-1 text-sm">Real-time financial overview</p>
      </div>

      {/* Stats Cards - Hidden for Cashiers */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users size={20} />
              </div>
              <CardTitle className="text-sm font-medium opacity-90">{t('totalStaffDebt')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-extrabold tracking-tight">{totalStaffDebt.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <AddTransactionModal />
        {isAdmin && <SettleCashBtn />}
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
        <CardHeader className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-lg">{t('recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('method')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('reportDate')}</TableHead>
                  <TableHead>{t('settled')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
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
                        tx.isSettled 
                          ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' 
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {tx.isSettled ? t('settled') : t('unsettled')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                      No transactions yet. Click &quot;Add Transaction&quot; to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
