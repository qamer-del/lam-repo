'use client'

import { useState } from 'react'
import {
  Shield, Search, ShieldCheck, ShieldOff, ShieldAlert,
  AlertTriangle, Clock, CheckCircle2, XCircle, Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WarrantyCheckCard } from '@/components/warranty-check-card'
import { WarrantyClaimModal } from '@/components/warranty-claim-modal'
import { checkWarrantyStatus } from '@/actions/warranty'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Props {
  role?: string
  isAdmin: boolean
  stats: {
    active: number
    expiringSoon: number
    claimed: number
    expired: number
  } | null
  expiringSoon: any[]
  activeWarranties: any[]
}

export function WarrantyClient({ role, isAdmin, stats, expiringSoon, activeWarranties }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'invoice' | 'sku'>('invoice')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const data = await checkWarrantyStatus(
        searchType === 'invoice' ? { invoiceNumber: searchQuery.trim() } : { sku: searchQuery.trim() }
      )
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const statCards = stats ? [
    { label: 'Active', value: stats.active, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800' },
    { label: 'Expiring Soon', value: stats.expiringSoon, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800' },
    { label: 'Claimed', value: stats.claimed, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/10', border: 'border-violet-200 dark:border-violet-800' },
    { label: 'Expired', value: stats.expired, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800' },
  ] : []

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl shadow-xl shadow-violet-500/30">
            <Shield size={30} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Warranty</h1>
            <p className="text-sm font-medium text-gray-400 mt-0.5">Replacement warranty tracking & claims</p>
          </div>
        </div>
        <WarrantyClaimModal />
      </div>

      {/* Stats — admin only */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={cn('rounded-2xl border-2 p-5 space-y-2', bg, border)}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                <Icon size={16} className={color} />
              </div>
              <p className={cn('text-3xl font-black tabular-nums', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-lg p-6 space-y-5">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Search size={18} className="text-violet-500" />
            Warranty Check
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Look up warranty status by invoice number or item SKU</p>
        </div>

        {/* Search type toggle */}
        <div className="flex gap-2">
          {(['invoice', 'sku'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                searchType === type
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {type === 'invoice' ? 'Invoice #' : 'Item SKU'}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
              {searchType === 'invoice' ? 'Invoice Number' : 'Item SKU / Code'}
            </Label>
            <Input
              placeholder={searchType === 'invoice' ? 'e.g. INV-1714819200000' : 'e.g. POL-001'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="h-14 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 focus:border-violet-500 font-bold px-5 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="h-14 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 text-white font-black transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Search
            </button>
          </div>
        </div>

        {/* Search results */}
        {searched && !searching && (
          <div className="space-y-4 animate-in fade-in duration-300 pt-2">
            {results && results.length > 0 ? (
              results.map(w => (
                <WarrantyCheckCard
                  key={w.id}
                  warranty={w}
                  showClaimButton={w.status === 'ACTIVE'}
                />
              ))
            ) : (
              <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <Shield size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="font-black text-gray-400">No warranty records found.</p>
                <p className="text-xs text-gray-400 mt-1">Check the {searchType === 'invoice' ? 'invoice number' : 'SKU code'} and try again.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expiring Soon — admin only */}
      {isAdmin && expiringSoon.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
          <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="font-black text-gray-800 dark:text-white">Expiring Within 30 Days</h2>
            <span className="ml-auto text-xs font-black bg-amber-500 text-white px-3 py-1 rounded-full">{expiringSoon.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {expiringSoon.map(w => (
              <div key={w.id} className="flex items-center gap-4 p-4 hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl shrink-0">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-white truncate">{w.item?.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{w.invoiceNumber}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-amber-600">{format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</p>
                  {(w.customer?.name || w.customerName) && (
                    <p className="text-[10px] text-gray-400">{w.customer?.name || w.customerName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Warranties — admin only */}
      {isAdmin && activeWarranties.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h2 className="font-black text-gray-800 dark:text-white">All Active Warranties</h2>
            <span className="ml-auto text-xs font-black bg-emerald-500 text-white px-3 py-1 rounded-full">{activeWarranties.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {activeWarranties.map(w => (
              <div key={w.id} className="flex items-center gap-4 p-4 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors group">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl shrink-0">
                  <ShieldCheck size={16} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-white truncate">{w.item?.name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{w.invoiceNumber}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-black text-emerald-600">Until {format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</p>
                  {(w.customer?.name || w.customerName) && (
                    <p className="text-[10px] text-gray-400">{w.customer?.name || w.customerName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
