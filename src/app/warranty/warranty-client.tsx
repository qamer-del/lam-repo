'use client'

import { useState, useTransition } from 'react'
import {
  Shield, Search, ShieldCheck, Clock, XCircle, Loader2,
  History, Package, Truck, RefreshCw, AlertTriangle,
  CheckCircle2, RotateCcw, ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WarrantyCheckCard } from '@/components/warranty-check-card'
import { WarrantyClaimModal } from '@/components/warranty-claim-modal'
import { SupplierWarrantyCaseModal } from '@/components/supplier-warranty-case-modal'
import { SupplierCaseResolveModal } from '@/components/supplier-case-resolve-modal'
import { checkWarrantyStatus } from '@/actions/warranty'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/providers/language-provider'
import { useRouter } from 'next/navigation'

type Tab = 'active' | 'history' | 'returns' | 'supplier'

interface Props {
  role?: string
  isAdmin: boolean
  stats: any
  expiringSoon: any[]
  activeWarranties: any[]
  replacementHistory: any[]
  returnStockItems: any[]
  supplierCases: any[]
  agents: any[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  SENT_TO_SUPPLIER: 'bg-blue-100 text-blue-700',
  REPLACED: 'bg-emerald-100 text-emerald-700',
  REPAIRED: 'bg-teal-100 text-teal-700',
  REFUNDED: 'bg-violet-100 text-violet-700',
  REJECTED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

export function WarrantyClient({ role, isAdmin, stats, expiringSoon, activeWarranties, replacementHistory, returnStockItems, supplierCases, agents }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'invoice' | 'sku'>('invoice')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [searched, setSearched] = useState(false)
  const [selectedCase, setSelectedCase] = useState<any | null>(null)
  const [caseModalOpen, setCaseModalOpen] = useState(false)

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

  const tabs = [
    { id: 'active' as Tab, label: 'Active', icon: ShieldCheck, count: stats?.active },
    { id: 'history' as Tab, label: 'History', icon: History, count: stats?.totalReplacements },
    { id: 'returns' as Tab, label: 'Returns', icon: Package, count: stats?.warrantyReturnItems },
    { id: 'supplier' as Tab, label: 'Supplier Cases', icon: Truck, count: supplierCases.length },
  ]

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl shadow-xl shadow-violet-500/30">
            <Shield size={30} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Warranty</h1>
            <p className="text-sm font-medium text-gray-400 mt-0.5">Multi-replacement · Supplier tracking · Full audit trail</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WarrantyClaimModal />
          {isAdmin && returnStockItems.length > 0 && (
            <SupplierWarrantyCaseModal
              returnStockItems={returnStockItems}
              agents={agents}
              onSuccess={() => router.refresh()}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Expiring 30d', value: stats.expiringSoon, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Replacements', value: stats.totalReplacements, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
            { label: 'Expired', value: stats.expired, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
            { label: 'Return Stock', value: stats.warrantyReturnItems, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
            { label: 'Damaged', value: stats.damagedItems, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
            { label: 'Open Cases', value: stats.pendingSupplierCases, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn('rounded-2xl border-2 p-4 space-y-1', bg)}>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className={cn('text-2xl font-black tabular-nums', color)}>{value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-lg p-6 space-y-5">
        <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Search size={18} className="text-violet-500" />
          Warranty Check
        </h2>
        <div className="flex gap-2">
          {(['invoice', 'sku'] as const).map(type => (
            <button key={type} onClick={() => setSearchType(type)}
              className={cn('px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                searchType === type ? 'bg-violet-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              )}>
              {type === 'invoice' ? t('invoiceNumber') : t('itemSku')}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Input
            placeholder={searchType === 'invoice' ? 'e.g. INV-1714819200000' : 'e.g. POL-001'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-14 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 focus:border-violet-500 font-bold px-5 text-sm"
          />
          <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
            className="h-14 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 disabled:opacity-40 text-white font-black flex items-center gap-2 shadow-lg">
            {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {t('search')}
          </button>
        </div>
        {searched && !searching && (
          <div className="space-y-4 animate-in fade-in duration-300 pt-2">
            {results && results.length > 0 ? (
              results.map(w => <WarrantyCheckCard key={w.id} warranty={w} showClaimButton={w.status === 'ACTIVE'} />)
            ) : (
              <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <Shield size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="font-black text-gray-400">{t('noWarrantyFound')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all',
                  tab === id
                    ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/50 dark:bg-violet-900/10'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}>
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                {count != null && count > 0 && (
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-black',
                    tab === id ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-600'
                  )}>{count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Active warranties tab */}
            {tab === 'active' && (
              <div className="space-y-3">
                {expiringSoon.length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Expiring within 30 days ({expiringSoon.length})</p>
                    </div>
                    <div className="space-y-2">
                      {expiringSoon.map(w => (
                        <div key={w.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl p-3">
                          <Clock size={14} className="text-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm truncate">{w.item?.name}</p>
                            <p className="text-[10px] text-gray-400">{w.invoiceNumber}</p>
                          </div>
                          <p className="text-xs font-black text-amber-600 shrink-0">{format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeWarranties.length === 0 ? (
                  <div className="py-12 text-center"><ShieldCheck size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 font-black">No active warranties</p></div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-96 overflow-y-auto">
                    {activeWarranties.map(w => (
                      <div key={w.id} className="flex items-center gap-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded-xl transition-colors">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl shrink-0"><ShieldCheck size={16} className="text-emerald-500" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm truncate">{w.item?.name}</p>
                            {w.replacementCount > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{w.replacementCount}× replaced</span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-gray-400">{w.invoiceNumber}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-emerald-600">Until {format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</p>
                          <p className="text-[10px] text-gray-400">{w.customer?.name || w.customerName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Replacement History tab */}
            {tab === 'history' && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {replacementHistory.length === 0 ? (
                  <div className="py-12 text-center"><History size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 font-black">No replacements yet</p></div>
                ) : (
                  replacementHistory.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <RefreshCw size={14} className="text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{r.replacementItem?.name}</p>
                        <p className="text-[10px] text-gray-400">
                          Invoice: {r.warranty?.invoiceNumber}
                          {r.warranty?.customerName && ` · ${r.warranty.customerName}`}
                          {r.recordedBy && ` · by ${r.recordedBy.name}`}
                        </p>
                        {r.notes && <p className="text-[10px] text-gray-400 italic truncate">{r.notes}</p>}
                      </div>
                      <p className="text-xs font-black text-gray-500 shrink-0">{format(new Date(r.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Warranty Return Stock tab */}
            {tab === 'returns' && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400">Defective items returned by customers awaiting supplier action.</p>
                {returnStockItems.length === 0 ? (
                  <div className="py-12 text-center"><Package size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 font-black">No warranty return items</p></div>
                ) : (
                  <div className="space-y-2">
                    {returnStockItems.map(item => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                        <Package size={16} className="text-orange-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm">{item.name}</p>
                          {item.sku && <p className="text-[10px] text-gray-400 font-mono">{item.sku}</p>}
                        </div>
                        <div className="text-right space-y-1">
                          {item.warrantyReturnStock > 0 && (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[9px] font-black uppercase text-orange-500">Return pool</span>
                              <span className="text-sm font-black text-orange-600">{item.warrantyReturnStock}</span>
                            </div>
                          )}
                          {item.damagedStock > 0 && (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[9px] font-black uppercase text-red-400">Damaged</span>
                              <span className="text-sm font-black text-red-500">{item.damagedStock}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Supplier Cases tab */}
            {tab === 'supplier' && (
              <div className="space-y-3">
                {supplierCases.length === 0 ? (
                  <div className="py-12 text-center"><Truck size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 font-black">No supplier cases yet</p><p className="text-xs text-gray-400 mt-1">Create one from the Warranty Returns tab</p></div>
                ) : (
                  supplierCases.map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => { setSelectedCase(sc); setCaseModalOpen(true) }}
                      className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all text-left group"
                    >
                      <Truck size={16} className="text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm">Case #{sc.id}</p>
                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', STATUS_COLORS[sc.status] || 'bg-gray-100 text-gray-600')}>
                            {sc.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {sc.agent?.name || 'No supplier'} · {sc.items.length} item type(s)
                          {sc.referenceNumber && ` · Ref: ${sc.referenceNumber}`}
                        </p>
                        <p className="text-[10px] text-gray-400">{format(new Date(sc.createdAt), 'dd MMM yyyy')}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supplier Case Modal */}
      {selectedCase && (
        <SupplierCaseResolveModal
          supplierCase={selectedCase}
          open={caseModalOpen}
          onOpenChange={v => { setCaseModalOpen(v); if (!v) setSelectedCase(null) }}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  )
}
