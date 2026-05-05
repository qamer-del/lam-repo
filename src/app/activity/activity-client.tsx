'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  TrendingUp, 
  RotateCcw, 
  History, 
  Search,
  Filter,
  Calendar,
  User,
  DollarSign,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs'
import { getActivityData } from '@/actions/activity'
import { toast } from 'sonner'

export default function ActivityClient({ initialData, initialTotal }: { initialData: any[], initialTotal: number }) {
  const [data, setData] = useState(initialData)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('ALL')
  const [dateRange, setDateRange] = useState('THIS_MONTH')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')

  const fetchActivity = async (filters: any) => {
    setLoading(true)
    try {
      const result = await getActivityData(filters)
      if (filters.page > 1) {
        setData(prev => [...prev, ...result.data])
      } else {
        setData(result.data)
      }
      setTotal(result.total)
    } catch (error) {
      toast.error('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity({ type: activeTab, dateRange, page: 1, limit: 30 })
    setPage(1)
  }, [activeTab, dateRange])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchActivity({ type: activeTab, dateRange, page: nextPage, limit: 30 })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <TrendingUp size={16} className="text-emerald-600" />
      case 'RETURN': return <RotateCcw size={16} className="text-rose-500" />
      case 'SETTLEMENT': return <History size={16} className="text-blue-500" />
      default: return <DollarSign size={16} className="text-gray-500" />
    }
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'SALE': return 'bg-emerald-50 text-emerald-700'
      case 'RETURN': return 'bg-rose-50 text-rose-700'
      case 'SETTLEMENT': return 'bg-blue-50 text-blue-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-gray-900 p-4 rounded-[24px] shadow-sm border border-gray-50 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          {['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH'].map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setDateRange(range)}
              className={cn(
                "rounded-full px-4 font-black uppercase tracking-widest text-[9px] transition-all",
                dateRange === range 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-gray-400 hover:bg-gray-100"
              )}
            >
              {range.replace('_', ' ')}
            </Button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="hidden sm:flex bg-gray-50 dark:bg-gray-800 p-1 rounded-full border border-gray-100 dark:border-gray-800">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDensity('compact')}
              className={cn("h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", density === 'compact' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400")}
            >
              Compact
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDensity('comfortable')}
              className={cn("h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", density === 'comfortable' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400")}
            >
              Comfortable
            </Button>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Search history..." 
              className="pl-10 h-10 rounded-full border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-gray-100 dark:border-gray-800 w-full justify-start rounded-none h-12 p-0 mb-6 overflow-x-auto">
          {['ALL', 'SALE', 'RETURN', 'SETTLEMENT'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 font-black uppercase tracking-widest text-[11px] text-gray-400 data-[state=active]:text-blue-600 h-full"
            >
              {tab === 'SETTLEMENT' ? 'Settlements' : tab === 'RETURN' ? 'Returns' : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className={cn(
          "bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800",
          density === 'compact' ? "px-0" : "px-2"
        )}>
          {data.map((item, i) => (
            <div 
              key={`${item.id}-${i}`} 
              className={cn(
                "flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all cursor-default",
                density === 'compact' ? "px-4 h-[56px]" : "px-6 h-20"
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                  density === 'compact' ? "w-9 h-9" : "w-12 h-12",
                  getTypeStyles(item.type)
                )}>
                  {getTypeIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                      {item.type === 'SALE' ? 'Sale' : item.type === 'RETURN' ? 'Return' : item.type === 'SETTLEMENT' ? 'Report' : item.type}
                    </p>
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest opacity-50">—</span>
                    <p className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-wide">
                      {item.user}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    {density === 'comfortable' && <span className="flex items-center gap-1"><User size={10} /> {item.user}</span>}
                    {density === 'comfortable' && <span className="hidden sm:inline">•</span>}
                    <span className="hidden sm:flex items-center gap-1"><Calendar size={10} /> {format(new Date(item.timestamp), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className={cn(
                    "font-black tabular-nums tracking-tight",
                    density === 'compact' ? "text-base" : "text-xl",
                    item.type === 'SALE' ? 'text-emerald-600' : item.type === 'RETURN' ? 'text-rose-500' : 'text-gray-900 dark:text-white'
                  )}>
                    {item.type === 'SALE' ? '+' : item.type === 'RETURN' ? '-' : ''}
                    {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <span className="text-[10px] ml-1 font-bold opacity-30">SAR</span>
                  </p>
                  <div className="sm:hidden text-[9px] font-bold text-gray-300">
                    {format(new Date(item.timestamp), 'h:mm a')}
                  </div>
                </div>
                <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 text-blue-500 cursor-pointer">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}

          {data.length === 0 && !loading && (
            <div className="py-24 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-200">
                <History size={32} />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">No activity logs found</p>
            </div>
          )}
        </div>

        {data.length < total && (
          <div className="mt-8">
            <Button
              onClick={loadMore}
              disabled={loading}
              className="w-full h-14 rounded-[28px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-blue-600 font-black uppercase tracking-widest text-[11px] shadow-sm hover:bg-gray-50 active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  Refreshing List...
                </div>
              ) : `Show More (${total - data.length} remaining)`}
            </Button>
          </div>
        )}
      </Tabs>
    </div>
  )
}
