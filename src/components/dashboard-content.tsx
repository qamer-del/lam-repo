'use client'

import { useEffect, useState } from 'react'
import { useStore, TransType, PayMethod, Transaction } from '@/store/useStore'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'
import { AddTransactionModal } from './add-transaction-modal'
import { SettleCashBtn } from './settle-cash-btn'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SettlementHistory } from './settlement-history'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  DollarSign, 
  Wifi, 
  Users, 
  Receipt, 
  Landmark,
  Package,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  History,
  CreditCard,
  Banknote,
  Plus,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

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
  const { 
    cashInDrawer, 
    networkSales, 
    tabbyBalance, 
    tamaraBalance, 
    salaryFundRemaining, 
    totalOutstandingCredit, 
    transactions, 
    setVaultData,
    isSettleCashOpen,
    setIsSettleCashOpen,
    isAddTxOpen,
    setIsAddTxOpen
  } = useStore()
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
  const isOwner = userRole === 'OWNER'
  const canViewStats = isAdmin || isOwner

  useEffect(() => {
    setVaultData(initialData)
  }, [initialData, setVaultData])

  const paginatedTransactions = transactions.slice(0, 15) // Show top 15 on dashboard

  return (
    <div className="min-h-screen bg-[#F9F9F9] dark:bg-[#0A0A0A] pb-24 font-sans text-gray-900 dark:text-gray-100">
      {/* Root Level Modals */}
      <SettleCashBtn 
        open={isSettleCashOpen} 
        onOpenChange={setIsSettleCashOpen} 
        triggerClassName="hidden" 
      />
      {!isOwner && (
        <AddTransactionModal 
          open={isAddTxOpen} 
          onOpenChange={setIsAddTxOpen} 
          triggerClassName="hidden" 
        />
      )}

      {/* 1. Header (Clean SaaS Style) */}
      <header className="sticky top-0 z-30 bg-[#F9F9F9]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{format(new Date(), 'EEEE, MMM d')}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dashboard')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
               {!isOwner && (
                 <Button 
                   onClick={() => setIsAddTxOpen(true)}
                   className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
                 >
                   <Plus size={16} strokeWidth={2.5} />
                   <span>{t('addTransaction')}</span>
                 </Button>
               )}
            </div>

            {/* Global Actions Dropdown */}
            {isAdmin && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger render={
                  <Button variant="outline" className="h-9 px-3 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm shadow-sm flex items-center gap-2 transition-all">
                    <span className="hidden sm:inline">Actions</span>
                    <MoreHorizontal size={16} className="sm:hidden text-gray-500" />
                    <ChevronDown size={14} className="hidden sm:inline opacity-50" />
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-950">
                  <DropdownMenuGroup>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2">Operations</div>
                    <DropdownMenuItem 
                      onClick={() => setIsSettleCashOpen(true)}
                      className="h-10 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <Banknote size={16} className="text-gray-500" />
                      {t('settleCash')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  
                  {(tabbyBalance > 0 || tamaraBalance > 0) && (
                    <>
                      <DropdownMenuSeparator className="my-1 bg-gray-100 dark:bg-gray-800" />
                      <DropdownMenuGroup>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2">Settlements</div>
                        {tabbyBalance > 0 && (
                          <DropdownMenuItem 
                            onClick={async () => {
                              if(confirm(`Settle Tabby?`)) {
                                const { settleTabbySales } = await import('@/actions/transactions') as any
                                await settleTabbySales()
                                useStore.getState().setVaultData({ tabbyBalance: 0 })
                              }
                            }}
                            className="h-10 px-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium gap-3 cursor-pointer"
                          >
                            <CreditCard size={16} />
                            Settle Tabby
                          </DropdownMenuItem>
                        )}
                        {tamaraBalance > 0 && (
                          <DropdownMenuItem 
                            onClick={async () => {
                              if(confirm(`Settle Tamara?`)) {
                                const { settleTamaraSales } = await import('@/actions/transactions') as any
                                await settleTamaraSales()
                                useStore.getState().setVaultData({ tamaraBalance: 0 })
                              }
                            }}
                            className="h-10 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-medium gap-3 cursor-pointer"
                          >
                            <CreditCard size={16} />
                            Settle Tamara
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* User Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-sm shrink-0" />
          </div>
        </div>
      </header>

      {/* Main Single-Column Layout */}
      <main className="px-4 py-8 max-w-6xl mx-auto space-y-10">
        
        {/* 2. Key Stats Cards (High Density) */}
        {canViewStats && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t('cashInDrawer'), val: cashInDrawer, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20', icon: <DollarSign size={18} /> },
                { label: t('networkSales'), val: networkSales, color: 'text-blue-600 bg-blue-100 dark:bg-blue-500/20', icon: <Wifi size={18} /> },
                { label: 'Salary Funds', val: salaryFundRemaining, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20', icon: <Landmark size={18} /> },
                { label: 'Inventory Value', val: inventorySummary?.totalValue || 0, color: 'text-violet-600 bg-violet-100 dark:bg-violet-500/20', icon: <Package size={18} /> },
              ].map((stat, i) => (
                <Card key={i} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", stat.color)}>
                        {stat.icon}
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-black tabular-nums tracking-tight">
                        {stat.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-[10px] ml-1 font-bold text-gray-400 uppercase">sar</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Secondary Metrics (Compact) */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Other Balances:</span>
              {(totalOutstandingCredit > 0 || tabbyBalance > 0 || tamaraBalance > 0) ? (
                <>
                  {totalOutstandingCredit > 0 && <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-orange-500"/> Outstanding: <span className="text-gray-900 dark:text-white tabular-nums">{totalOutstandingCredit.toLocaleString()}</span> SAR</span>}
                  {tabbyBalance > 0 && <span className="flex items-center gap-1.5"><Package size={14} className="text-violet-500"/> Tabby: <span className="text-gray-900 dark:text-white tabular-nums">{tabbyBalance.toLocaleString()}</span> SAR</span>}
                  {tamaraBalance > 0 && <span className="flex items-center gap-1.5"><Package size={14} className="text-rose-500"/> Tamara: <span className="text-gray-900 dark:text-white tabular-nums">{tamaraBalance.toLocaleString()}</span> SAR</span>}
                </>
              ) : (
                <span>All clear</span>
              )}
            </div>
          </section>
        )}

        {/* 3. Recent Activity (Compact List) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Activity</h3>
            <Link href="/activity" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 group">
              View All <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          
          <DashboardActivity initialTransactions={paginatedTransactions} initialSettlements={initialData.recentSettlements} />
        </section>

        {/* 4. Performance & Reports */}
        {canViewStats && (
          <section className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800/50">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white px-1">Recent Reports</h3>
            <SettlementHistory initialSettlements={initialData.recentSettlements} />
          </section>
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      {!isOwner && (
        <div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <Button 
            onClick={() => setIsAddTxOpen(true)}
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-all p-0 border-none"
          >
             <Plus size={24} strokeWidth={3} />
          </Button>
        </div>
      )}
    </div>
  )
}

function DashboardActivity({ initialTransactions, initialSettlements }: { initialTransactions: any[], initialSettlements: any[] }) {
  const { t } = useLanguage()

  // Combine and sort recent activity into a single stream
  const data = [
    ...initialTransactions.map(tx => ({ ...tx, activityType: tx.type })),
    ...initialSettlements.map(s => ({ 
      id: `s-${s.id}`, 
      activityType: 'SETTLEMENT', 
      amount: s.actualCashCounted, 
      createdAt: s.reportDate,
      description: 'Shift Closure',
      recordedBy: s.performedBy
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15) // Keep it compact on dashboard

  const getIcon = (type: string) => {
    switch(type) {
      case 'SALE': return <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
      case 'RETURN': return <RotateCcw size={14} className="text-rose-600 dark:text-rose-400" />
      case 'SETTLEMENT': return <History size={14} className="text-blue-600 dark:text-blue-400" />
      default: return <Receipt size={14} className="text-gray-500 dark:text-gray-400" />
    }
  }

  const getBgStyle = (type: string) => {
    switch(type) {
      case 'SALE': return 'bg-emerald-50 dark:bg-emerald-500/10'
      case 'RETURN': return 'bg-rose-50 dark:bg-rose-500/10'
      case 'SETTLEMENT': return 'bg-blue-50 dark:bg-blue-500/10'
      default: return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 sm:px-5 sm:py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", getBgStyle(item.activityType))}>
                {getIcon(item.activityType)}
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {item.activityType === 'SALE' ? 'Sale' : item.activityType === 'RETURN' ? 'Return' : item.activityType === 'SETTLEMENT' ? 'Report' : item.activityType}
                  </p>
                  <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">•</span>
                  <p className="text-xs text-gray-500 truncate hidden sm:inline">
                    {item.recordedBy?.name || 'System'}
                  </p>
                </div>
                {item.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {item.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 sm:hidden mt-0.5">
                  {item.recordedBy?.name || 'System'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0 pl-4">
              <p className={cn(
                "text-sm font-bold tabular-nums",
                item.activityType === 'SALE' ? 'text-emerald-600 dark:text-emerald-400' : item.activityType === 'RETURN' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
              )}>
                {item.activityType === 'SALE' ? '+' : item.activityType === 'RETURN' ? '-' : ''}
                {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-[10px] ml-1 font-semibold text-gray-400 uppercase">SAR</span>
              </p>
              <p className="text-[11px] font-medium text-gray-400 tabular-nums mt-0.5">
                {format(new Date(item.createdAt), 'MMM d, h:mm a')}
              </p>
            </div>
            
          </div>
        ))}
        
        {data.length === 0 && (
          <div className="py-12 text-center text-sm font-medium text-gray-500">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}
