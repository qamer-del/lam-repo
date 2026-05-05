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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
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

  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [transactions.length])

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'SALE': return t('sale')
      case 'EXPENSE': return t('expense')
      case 'ADVANCE': return t('advance')
      case 'OWNER_WITHDRAWAL': return t('ownerWithdrawal')
      default: return type
    }
  }

  const paginatedTransactions = transactions.slice(0, 15) // Show top 15 on dashboard

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      SALE: 'text-emerald-600 bg-emerald-50',
      EXPENSE: 'text-red-600 bg-red-50',
      ADVANCE: 'text-amber-600 bg-amber-50',
      OWNER_WITHDRAWAL: 'text-purple-600 bg-purple-50',
      SALARY_PAYMENT: 'text-indigo-600 bg-indigo-50',
    }
    return map[type] || 'text-gray-600 bg-gray-50'
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'SALE': return <TrendingUp size={18} className="text-emerald-600" />
      case 'EXPENSE': return <DollarSign size={18} className="text-red-600" />
      case 'ADVANCE': return <Users size={18} className="text-amber-600" />
      case 'OWNER_WITHDRAWAL': return <Landmark size={18} className="text-purple-600" />
      default: return <Receipt size={18} className="text-gray-600" />
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] dark:bg-gray-950 pb-24">
      {/* Root Level Modals (Mounted early for stable portal targets) */}
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

      {/* 1. Header (iOS style) */}
      <header className="sticky top-0 z-30 bg-[#F9F9F9]/80 dark:bg-gray-950/80 backdrop-blur-xl px-4 pt-8 pb-4 border-b border-gray-100 dark:border-gray-900/50">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{format(new Date(), 'EEEE, MMM d')}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
              {t('dashboard')}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
               {!isOwner && (
                 <Button 
                   onClick={() => setIsAddTxOpen(true)}
                   className="h-9 px-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                 >
                   <Plus size={14} strokeWidth={3} />
                   {t('addTransaction')}
                 </Button>
               )}
            </div>

            {/* Global Actions Dropdown (Responsive) */}
            {isAdmin && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger render={
                  <Button variant="outline" className="h-9 w-9 sm:w-auto sm:px-4 rounded-xl border-gray-100 dark:border-gray-800 font-black uppercase tracking-widest text-[9px] gap-2 hover:bg-gray-50 active:scale-95 transition-all p-0 sm:p-auto bg-white dark:bg-gray-900 shadow-sm border">
                    <Plus size={14} strokeWidth={3} className="hidden sm:inline" />
                    <span className="hidden sm:inline">Actions</span>
                    <ChevronDown size={14} className="hidden sm:inline opacity-50" />
                    <MoreHorizontal size={18} className="sm:hidden text-gray-500" />
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white dark:bg-gray-950">
                  <DropdownMenuGroup>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Operations</div>
                    <DropdownMenuItem 
                      onClick={() => setIsSettleCashOpen(true)}
                      onSelect={() => setIsSettleCashOpen(true)}
                      className="h-10 px-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 text-gray-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Banknote size={16} />
                      {t('settleCash')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  
                  {(tabbyBalance > 0 || tamaraBalance > 0) && (
                    <>
                      <DropdownMenuSeparator className="my-1 bg-gray-50 dark:bg-gray-800" />
                      <DropdownMenuGroup>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Settlements</div>
                        {tabbyBalance > 0 && (
                          <DropdownMenuItem 
                            onClick={async () => {
                              if(confirm(`Settle Tabby?`)) {
                                const { settleTabbySales } = await import('@/actions/transactions') as any
                                await settleTabbySales()
                                useStore.getState().setVaultData({ tabbyBalance: 0 })
                              }
                            }}
                            onSelect={async (e) => {
                              if(confirm(`Settle Tabby?`)) {
                                const { settleTabbySales } = await import('@/actions/transactions') as any
                                await settleTabbySales()
                                useStore.getState().setVaultData({ tabbyBalance: 0 })
                              }
                            }}
                            className="h-10 px-3 rounded-xl hover:bg-indigo-50 text-indigo-600 text-xs font-bold gap-3"
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
                            onSelect={async (e) => {
                              if(confirm(`Settle Tamara?`)) {
                                const { settleTamaraSales } = await import('@/actions/transactions') as any
                                await settleTamaraSales()
                                useStore.getState().setVaultData({ tamaraBalance: 0 })
                              }
                            }}
                            className="h-10 px-3 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold gap-3"
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
            
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20 border-2 border-white dark:border-gray-800 shrink-0" />
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-8 max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0">
        <div className="lg:col-span-8 space-y-8">
          {/* 2. Key Stats Cards (iOS inspired) */}
          {canViewStats && (
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: t('cashInDrawer'), val: cashInDrawer, color: 'bg-emerald-500', icon: <DollarSign size={20} /> },
                  { label: t('networkSales'), val: networkSales, color: 'bg-blue-500', icon: <Wifi size={20} /> },
                  { label: 'Salary Funds', val: salaryFundRemaining, color: 'bg-indigo-500', icon: <Landmark size={20} /> },
                  { label: 'Outstanding', val: totalOutstandingCredit, color: 'bg-orange-500', icon: <AlertTriangle size={20} /> },
                  { label: 'Tabby Balance', val: tabbyBalance, color: 'bg-violet-500', icon: <Package size={20} /> },
                  { label: 'Tamara Balance', val: tamaraBalance, color: 'bg-rose-500', icon: <Package size={20} /> },
                ].map((stat, i) => (
                  <Card key={i} className="border-none bg-white dark:bg-gray-900 rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 group overflow-hidden">
                    <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                        {stat.icon}
                      </div>
                      <div className="mt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                          {stat.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          <span className="text-[10px] ml-1 text-gray-400 uppercase">sar</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* 4. Recent Transactions (iOS Style List with Tabs) */}
          <section className="space-y-4">
            <div className="flex justify-between items-end px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Recent Activity</h3>
              <Link href="/activity" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1 group">
                View All <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            
            <DashboardActivity initialTransactions={paginatedTransactions} initialSettlements={initialData.recentSettlements} />
          </section>
        </div>

        {/* Floating Action Button for Mobile */}
        {!isOwner && (
          <div className="fixed bottom-6 right-6 z-50 sm:hidden">
            <Button 
              onClick={() => setIsAddTxOpen(true)}
              className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center active:scale-90 transition-all p-0 border-none"
            >
               <Plus size={28} strokeWidth={3} />
            </Button>
          </div>
        )}


        {/* 5. Performance / History (Sidebar on Desktop, Bottom on Mobile) */}
        {canViewStats && (
          <div className="lg:col-span-4 space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 ml-1">Performance</h3>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-[30px] shadow-sm space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inventory Value</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {inventorySummary?.totalValue?.toLocaleString() || '0'}
                    <span className="text-xs ml-1 font-bold text-gray-400">SAR</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
                   <div className="space-y-0.5">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Low Stock</p>
                     <p className="text-lg font-black text-amber-500">{inventorySummary?.lowStockCount || 0}</p>
                   </div>
                   <div className="space-y-0.5">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Out Of Stock</p>
                     <p className="text-lg font-black text-red-500">{inventorySummary?.outOfStockCount || 0}</p>
                   </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 ml-1">Recent Reports</h3>
              <SettlementHistory initialSettlements={initialData.recentSettlements} />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function DashboardActivity({ initialTransactions, initialSettlements }: { initialTransactions: any[], initialSettlements: any[] }) {
  const [activeTab, setActiveTab] = useState('ALL')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')
  const [data, setData] = useState<any[]>([])
  const { t } = useLanguage()

  const getIcon = (type: string) => {
    switch(type) {
      case 'SALE': return <TrendingUp size={16} className="text-emerald-600" />
      case 'RETURN': return <RotateCcw size={16} className="text-rose-500" />
      case 'SETTLEMENT': return <History size={16} className="text-blue-500" />
      default: return <Receipt size={16} className="text-gray-400" />
    }
  }

  const getStyle = (type: string) => {
    switch(type) {
      case 'SALE': return 'text-emerald-600 bg-emerald-50'
      case 'RETURN': return 'text-rose-600 bg-rose-50'
      case 'SETTLEMENT': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  useEffect(() => {
    let combined: any[] = []
    if (activeTab === 'ALL') {
      combined = [
        ...initialTransactions.map(tx => ({ ...tx, activityType: tx.type })),
        ...initialSettlements.map(s => ({ 
          id: `s-${s.id}`, 
          activityType: 'SETTLEMENT', 
          amount: s.actualCashCounted, 
          createdAt: s.reportDate,
          description: 'Shift Closure / Settlement',
          recordedBy: s.performedBy
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      combined = activeTab === 'SETTLEMENT'
        ? initialSettlements.map(s => ({
            id: `s-${s.id}`,
            activityType: 'SETTLEMENT',
            amount: s.actualCashCounted,
            createdAt: s.reportDate,
            description: 'Shift Closure / Settlement',
            recordedBy: s.performedBy
          }))
        : initialTransactions.filter(tx => tx.type === activeTab).map(tx => ({ ...tx, activityType: tx.type }))
    }
    setData(combined.slice(0, 40)) // Show top 40 for POS-style density
  }, [activeTab, initialTransactions, initialSettlements])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-white/40 dark:bg-gray-900/40 p-1 rounded-full border border-gray-100 dark:border-gray-800 flex justify-between h-9 w-full max-w-[360px] overflow-hidden">
            {['ALL', 'SALE', 'RETURN', 'SETTLEMENT'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-1 rounded-full font-black uppercase tracking-widest text-[8px] data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all px-1 h-full"
              >
                {tab === 'SETTLEMENT' ? 'Reports' : tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="hidden sm:flex bg-gray-50 dark:bg-gray-800/50 p-0.5 rounded-lg border border-gray-100/50 dark:border-gray-800">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDensity('compact')}
            className={cn("h-6 px-3 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", density === 'compact' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600")}
          >
            Compact
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDensity('comfortable')}
            className={cn("h-6 px-3 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", density === 'comfortable' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600")}
          >
            Comfy
          </Button>
        </div>
      </div>

      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800",
        density === 'compact' ? "px-0" : "px-1"
      )}>
        {data.map((item) => (
          <div 
            key={item.id} 
            className={cn(
              "flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-default",
              density === 'compact' ? "px-3 h-[52px]" : "px-4 h-16"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                density === 'compact' ? "w-8 h-8" : "w-11 h-11",
                getStyle(item.activityType)
              )}>
                {getIcon(item.activityType)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                    {item.activityType === 'SALE' ? 'Sale' : item.activityType === 'RETURN' ? 'Return' : item.activityType === 'SETTLEMENT' ? 'Report' : item.activityType}
                  </p>
                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest opacity-50">—</span>
                  <p className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-wide">
                    {item.recordedBy?.name || 'System'}
                  </p>
                </div>
                {item.description && density === 'comfortable' && (
                  <p className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className={cn(
                  "font-black tabular-nums tracking-tight",
                  density === 'compact' ? "text-sm" : "text-base",
                  item.activityType === 'SALE' ? 'text-emerald-600' : item.activityType === 'RETURN' ? 'text-rose-500' : 'text-blue-600'
                )}>
                  {item.activityType === 'SALE' ? '+' : item.activityType === 'RETURN' ? '-' : ''}
                  {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-[9px] ml-1 font-bold opacity-30">SAR</span>
                </p>
                <div className="flex items-center justify-end gap-1.5 sm:hidden">
                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">
                    {item.method || 'LOG'}
                  </p>
                  <span className="text-[8px] text-gray-200 opacity-50">•</span>
                  <p className="text-[9px] font-bold text-gray-400 tabular-nums">
                    {format(new Date(item.createdAt), 'h:mm a')}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end shrink-0">
                <p className={cn("font-bold text-gray-400 tabular-nums uppercase", density === 'compact' ? "text-[9px]" : "text-[10px]")}>
                  {format(new Date(item.createdAt), 'h:mm a')}
                </p>
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">
                  {item.method || 'RECORD'}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {data.length === 0 && (
          <div className="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[9px]">
            No records found
          </div>
        )}
      </div>
    </div>
  )
}
