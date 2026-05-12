'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/providers/language-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  BarChart3, TrendingUp, TrendingDown, Wallet, ShoppingBag, 
  ArrowUpRight, ArrowDownLeft, FileText, Calendar, Search,
  ChevronRight, ArrowRight, History, CreditCard, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'

interface FinanceClientProps {
  data: any
}

export default function FinanceClient({ data }: FinanceClientProps) {
  const { t, locale } = useLanguage()
  const { stats, last6Months, methodBreakdown, recentExpenses, recentPurchases, allTransactions } = data
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'purchases' | 'transactions'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR'
  }

  // Handle pagination and filtering
  const rawList = activeTab === 'expenses' ? recentExpenses : activeTab === 'purchases' ? recentPurchases : allTransactions
  const filteredList = rawList.filter((item: any) => {
    const str = (item.description || item.note || '').toLowerCase()
    return str.includes(searchQuery.toLowerCase())
  })
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE)
  const paginatedList = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleTabChange = (tab: any) => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchQuery('')
  }

  const StatCard = ({ title, value, icon: Icon, description, trend, color, gradient }: any) => (
    <Card className="relative overflow-hidden border-none shadow-xl bg-white dark:bg-gray-900 group">
      <div className={cn("absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10 bg-gradient-to-br", gradient)} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">{title}</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(value)}
            </h3>
            {description && <p className="text-[10px] text-gray-400 font-bold">{description}</p>}
          </div>
          <div className={cn("p-3 rounded-2xl shadow-lg shadow-current/10", color)}>
            <Icon size={20} className="text-white" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-4 flex items-center gap-1.5">
            <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold", 
              trend >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")}>
              {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
              {Math.abs(trend).toFixed(1)}%
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <BarChart3 size={24} />
            </div>
            {t('accountingHub')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{t('financialStatus')}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          {(['overview', 'expenses', 'purchases', 'transactions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              {t(tab)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title={t('revenue')} 
              value={stats.totalRevenue} 
              icon={TrendingUp} 
              gradient="from-blue-600 to-cyan-500"
              color="bg-blue-600"
              description="Total Year-to-Date"
            />
            <StatCard 
              title={t('cogs')} 
              value={stats.totalCogs} 
              icon={Layers} 
              gradient="from-amber-600 to-orange-500"
              color="bg-amber-500"
              description="Cost of Sales"
            />
            <StatCard 
              title={t('operatingExpenses')} 
              value={stats.totalExpenses} 
              icon={ArrowDownLeft} 
              gradient="from-rose-600 to-pink-500"
              color="bg-rose-500"
              description="Expenses + Salaries"
            />
            <StatCard 
              title={t('netProfit')} 
              value={stats.netProfit} 
              icon={Wallet} 
              gradient="from-emerald-600 to-teal-500"
              color="bg-emerald-500"
              description="Final Bottom Line"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Monthly Chart */}
            <Card className="lg:col-span-2 border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
              <CardHeader className="p-8 border-b border-gray-50 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-widest text-gray-800 dark:text-white">Performance Analytics</CardTitle>
                    <CardDescription className="text-xs font-bold text-gray-400">Monthly Revenue vs. Total Outflow</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Expenses</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-64 flex items-end justify-between gap-4">
                  {last6Months.map((m: any, i: number) => {
                    const maxVal = Math.max(...last6Months.map((x: any) => Math.max(x.revenue, x.expenses, 1)))
                    const revHeight = (m.revenue / maxVal) * 100
                    const expHeight = (m.expenses / maxVal) * 100
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full group">
                        <div className="flex-1 w-full flex items-end justify-center gap-1.5">
                          <div 
                            className="w-full max-w-[20px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20" 
                            style={{ height: `${revHeight}%` }}
                          />
                          <div 
                            className="w-full max-w-[20px] bg-gradient-to-t from-rose-500 to-rose-300 rounded-t-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-rose-500/20" 
                            style={{ height: `${expHeight}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.month}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card className="border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
              <CardHeader className="p-8 border-b border-gray-50 dark:border-gray-800 text-center">
                <CardTitle className="text-lg font-black uppercase tracking-widest text-gray-800 dark:text-white">Revenue Mix</CardTitle>
                <CardDescription className="text-xs font-bold text-gray-400">By Payment Method</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {Object.entries(methodBreakdown).map(([method, amount]: [any, any]) => {
                  const percent = (amount / stats.totalRevenue) * 100
                  return (
                    <div key={method} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t(method.toLowerCase()) || method}</span>
                        <span className="text-xs font-black tabular-nums">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {(activeTab === 'expenses' || activeTab === 'purchases' || activeTab === 'transactions') && (
        <Card className="border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-gray-50 dark:border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-widest text-gray-800 dark:text-white">
                  {activeTab === 'expenses' ? t('operatingExpenses') : activeTab === 'purchases' ? t('inventoryPurchases') : t('recentTransactions')}
                </CardTitle>
                <CardDescription className="text-xs font-bold text-gray-400">Detailed financial records and audit trail</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input 
                  placeholder="Filter records..."
                  className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-950/30">
                <TableRow className="border-b border-gray-50 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('date')}</TableHead>
                  <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('description')}</TableHead>
                  <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('method')}</TableHead>
                  <TableHead className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">{t('amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.map((item: any) => (
                    <TableRow key={item.id} className="border-b border-gray-50 dark:border-gray-800 group hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">
                            {format(new Date(item.createdAt), 'dd MMM yyyy')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold tabular-nums">
                            {format(new Date(item.createdAt), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {item.description || item.note || t('noDescription')}
                          </span>
                          {item.recordedBy && (
                            <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">
                              By: {item.recordedBy.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                          {t(item.method.toLowerCase()) || item.method}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <span className={cn("text-sm font-black tabular-nums", 
                          item.type === 'SALE' ? "text-emerald-600" : "text-rose-600")}>
                          {(item.amount || item.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl font-bold h-9 px-4 border-gray-100 dark:border-gray-800"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl font-bold h-9 px-4 border-gray-100 dark:border-gray-800"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
