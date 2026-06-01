'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import {
  Plus, Check, X, Pencil, RotateCcw, Loader2, Package,
  ChevronLeft, ChevronRight, FilterIcon, ChevronDown, Search,
  User, FileText, Hash, Calculator, Layers, AlertCircle
} from 'lucide-react'
import { createConsumptionRequest, approveConsumptionRequest, rejectConsumptionRequest, reverseConsumptionRequest, editConsumptionRequest } from '@/actions/inventory-consumption'
import { toast } from 'sonner'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const PAGE_SIZE = 10

const PREDEFINED_REASONS_KEYS = [
  'reasonStaffUsage',
  'reasonCleaning',
  'reasonInternalOps',
  'reasonMaintenance',
  'reasonDamagedReplacement',
] as const

// ─── Inline Request Form ───────────────────────────────────────────────────────
function InlineRequestForm({
  inventoryItems,
  staffMembers,
  onSuccess,
}: {
  inventoryItems: any[]
  staffMembers: any[]
  onSuccess: () => void
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [staffId, setStaffId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [reasonKey, setReasonKey] = useState<typeof PREDEFINED_REASONS_KEYS[number]>('reasonStaffUsage')
  const [notes, setNotes] = useState('')

  const [itemSearch, setItemSearch] = useState('')
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false)
  const itemSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setItemDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredItems = inventoryItems.filter(i => 
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(itemSearch.toLowerCase())) ||
    (i.barcode && i.barcode.toLowerCase().includes(itemSearch.toLowerCase()))
  )

  const selectedItem = inventoryItems.find(i => i.id === parseInt(itemId))
  const totalCost = selectedItem && quantity && !isNaN(parseFloat(quantity))
    ? parseFloat(quantity) * (selectedItem.unitCost || 0)
    : 0

  const reset = () => {
    setItemId(''); setQuantity('1'); setStaffId('')
    setEmployeeName(''); setReasonKey('reasonStaffUsage'); setNotes('')
    setItemSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(quantity)
    if (!itemId || isNaN(qty) || qty <= 0) return
    if (!staffId && !employeeName.trim()) {
      toast.error(t('eitherStaffOrName'))
      return
    }
    setLoading(true)
    try {
      await createConsumptionRequest({
        itemId: parseInt(itemId),
        quantity: qty,
        staffId: staffId ? parseInt(staffId) : null,
        employeeName: employeeName.trim() || null,
        reason: t(reasonKey),
        notes: notes.trim() || null
      })
      toast.success(t('submitRequest') + ' ✓')
      reset()
      router.refresh()
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || t('operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Step indicator bar */}
      <div className="flex items-center gap-0 mb-8">
        {[
          { icon: Package, label: t('item') },
          { icon: Hash, label: t('quantity') },
          { icon: User, label: t('staffOrName') },
          { icon: FileText, label: t('notesOptional') },
        ].map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
                <step.icon size={13} className="text-blue-500" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:block">{step.label}</span>
            </div>
            {i < 3 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Item selector */}
          <div className="group">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <Package size={11} />
              {t('item')} <span className="text-red-400">*</span>
            </label>
            <div className="relative" ref={itemSearchRef}>
              <div 
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:border-blue-400 transition-all"
                onClick={() => setItemDropdownOpen(true)}
              >
                {selectedItem ? (
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{selectedItem.name}</span>
                    {selectedItem.sku && <span className="text-[10px] text-gray-400 font-mono">{selectedItem.sku}</span>}
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-gray-400">{t('selectConsumptionItem')}</span>
                )}
                <div className="flex items-center gap-2">
                  {selectedItem && (
                    <button 
                      type="button"
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                      onClick={(e) => { e.stopPropagation(); setItemId(''); setItemSearch(''); }}
                    >
                      <X size={13} className="text-gray-500" />
                    </button>
                  )}
                  <ChevronDown size={15} className="text-gray-400" />
                </div>
              </div>

              {itemDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name, SKU, or barcode..."
                        value={itemSearch}
                        onChange={e => setItemSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">No items found</div>
                    ) : (
                      filteredItems.map(i => (
                        <button
                          key={i.id}
                          type="button"
                          disabled={i.currentStock <= 0}
                          onClick={() => {
                            setItemId(i.id.toString())
                            setItemDropdownOpen(false)
                            setItemSearch('')
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors",
                            i.currentStock <= 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{i.name}</p>
                            {i.sku && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{i.sku}</p>}
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            <p className={cn("text-xs font-bold", i.currentStock <= 0 ? "text-red-500" : "text-emerald-600")}>
                              {i.currentStock} {i.unit}
                            </p>
                            <p className="text-[10px] text-gray-400">{i.unitCost?.toLocaleString()} SAR</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Item info chip */}
            {selectedItem ? (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                  {t('unitCost')}: {selectedItem.unitCost?.toLocaleString()} SAR
                </span>
                <span className="ml-auto text-[11px] font-semibold text-blue-500">
                  {selectedItem.currentStock} {selectedItem.unit} {t('filterApproved') === 'Approved' ? 'in stock' : 'متوفر'}
                </span>
              </div>
            ) : (
              <div className="mt-2 h-[30px]" />
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <Calculator size={11} />
              {t('quantity')} <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(0.5, parseFloat(q || '1') - 0.5).toString())}
                className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg flex-shrink-0"
              >
                −
              </button>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="flex-1 text-center px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-lg font-black text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity(q => (parseFloat(q || '1') + 0.5).toString())}
                className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg flex-shrink-0"
              >
                +
              </button>
            </div>
            {/* Total cost preview */}
            {totalCost > 0 && (
              <div className="mt-2 flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {t('filterApproved') === 'Approved' ? 'Total Cost' : 'التكلفة الإجمالية'}
                </span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <Layers size={11} />
              {t('reasonLabel')} <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PREDEFINED_REASONS_KEYS.map(rk => (
                <button
                  key={rk}
                  type="button"
                  onClick={() => setReasonKey(rk)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all border',
                    reasonKey === rk
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-700'
                  )}
                >
                  {t(rk)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5 flex flex-col">
          {/* Staff selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <User size={11} />
              {t('staffOrName')} <span className="text-red-400">*</span>
            </label>
            <p className="text-[11px] text-gray-400 mb-3">{t('filterApproved') === 'Approved' ? 'Select a staff member or type an employee name' : 'اختر موظفاً أو اكتب اسماً'}</p>

            <div className="relative mb-3">
              <select
                value={staffId}
                onChange={e => { setStaffId(e.target.value); setEmployeeName('') }}
                className="w-full appearance-none px-4 py-3.5 pr-10 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all outline-none cursor-pointer"
              >
                <option value="">{t('selectStaff')}</option>
                {staffMembers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">{t('filterApproved') === 'Approved' ? 'or' : 'أو'}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="relative mt-3">
              <input
                type="text"
                placeholder={t('orTypeName')}
                value={employeeName}
                onChange={e => { setEmployeeName(e.target.value); setStaffId('') }}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all outline-none"
              />
            </div>

            {/* Validation hint */}
            {!staffId && !employeeName && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                <AlertCircle size={11} />
                {t('eitherStaffOrName')}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="flex-1 flex flex-col">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <FileText size={11} />
              {t('notesOptional')}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder={t('filterApproved') === 'Approved' ? 'Any additional context or details...' : 'أي تفاصيل إضافية...'}
              className="flex-1 w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-semibold text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all outline-none resize-none"
            />
          </div>

          {/* Summary card */}
          {selectedItem && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">
                {t('filterApproved') === 'Approved' ? 'Request Summary' : 'ملخص الطلب'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-semibold">{t('item')}</span>
                <span className="text-xs font-black text-gray-800 dark:text-gray-100 max-w-[60%] text-right">{selectedItem.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-semibold">{t('quantity')}</span>
                <span className="text-xs font-black text-gray-800 dark:text-gray-100">{quantity || '—'} {selectedItem.unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-semibold">{t('reasonLabel')}</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">{t(reasonKey)}</span>
              </div>
              {totalCost > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs text-gray-500 font-semibold">{t('filterApproved') === 'Approved' ? 'Est. Cost' : 'التكلفة'}</span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => { reset(); onSuccess() }}
              className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !itemId}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-black rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {t('submitRequest')}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
export function ConsumptionClient({
  requests,
  inventoryItems,
  staffMembers,
  userRole
}: {
  requests: any[]
  inventoryItems: any[]
  staffMembers: any[]
  userRole: string
}) {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const isRTL = locale === 'ar'

  const [showForm, setShowForm] = useState(false)
  const [loadingAction, setLoadingAction] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const formRef = useRef<HTMLDivElement>(null)

  const isCashier = userRole === 'CASHIER'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const canManage = !isCashier

  // Scroll into view when form opens
  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [showForm])

  // Filter
  const filtered = statusFilter === 'ALL'
    ? requests
    : requests.filter(r => r.status === statusFilter)

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (f: StatusFilter) => {
    setStatusFilter(f)
    setCurrentPage(1)
  }

  const handleApprove = async (id: number) => {
    if (!confirm(t('confirmApprove'))) return
    setLoadingAction(id)
    try {
      await approveConsumptionRequest(id)
      toast.success(t('requestApproved'))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || t('operationFailed'))
    } finally { setLoadingAction(null) }
  }

  const handleReject = async (id: number) => {
    const reason = prompt(t('enterRejectionReason'))
    if (!reason) return
    setLoadingAction(id)
    try {
      await rejectConsumptionRequest(id, reason)
      toast.success(t('requestRejected'))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || t('operationFailed'))
    } finally { setLoadingAction(null) }
  }

  const handleReverse = async (id: number) => {
    if (!confirm(t('confirmReverse'))) return
    setLoadingAction(id)
    try {
      await reverseConsumptionRequest(id)
      toast.success(t('requestReversed'))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || t('operationFailed'))
    } finally { setLoadingAction(null) }
  }

  const handleSaveEdit = async (id: number) => {
    const qty = parseFloat(editQty)
    if (!editQty || isNaN(qty) || qty <= 0) return
    setLoadingAction(id)
    try {
      await editConsumptionRequest(id, qty)
      setEditingId(null)
      toast.success(t('qtyUpdated'))
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || t('operationFailed'))
    } finally { setLoadingAction(null) }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/30',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200/50 dark:border-red-700/30',
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200/50 dark:border-amber-700/30',
    }
    const label: Record<string, string> = {
      APPROVED: t('filterApproved'),
      REJECTED: t('filterRejected'),
      PENDING: t('filterPending'),
    }
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
        map[status] || 'bg-gray-100 text-gray-600 border-gray-200'
      )}>
        {label[status] || status}
      </span>
    )
  }

  const formatDate = (d: Date | string) =>
    format(new Date(d), 'dd MMM yy HH:mm', { locale: isRTL ? arSA : undefined })

  const filterLabels: { key: StatusFilter, label: string }[] = [
    { key: 'ALL', label: t('filterAll') },
    { key: 'PENDING', label: t('filterPending') },
    { key: 'APPROVED', label: t('filterApproved') },
    { key: 'REJECTED', label: t('filterRejected') },
  ]

  // Stats
  const pendingCount = requests.filter(r => r.status === 'PENDING').length
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length
  const totalValue = requests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.quantity * (r.item?.unitCost || 0), 0)

  return (
    <div className={cn('min-h-screen bg-[#F8F9FC] dark:bg-[#0A0A0A]', isRTL && 'rtl')}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-b border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('internalConsumption')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('internalConsumptionSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl shadow-lg transition-all active:scale-95',
              showForm
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            )}
          >
            {showForm ? (
              <><X size={16} /> {t('cancel')}</>
            ) : (
              <><Plus size={16} /> {t('newRequest')}</>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Inline Form Panel (slide-in) ─────────────────────────── */}
        <div
          ref={formRef}
          className={cn(
            'overflow-hidden transition-all duration-500 ease-in-out',
            showForm ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-blue-100 dark:border-blue-900/40 shadow-xl shadow-blue-500/5 overflow-hidden mb-2">
            {/* Panel header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">{t('newRequest')}</h2>
                <p className="text-xs text-blue-100 mt-0.5">{t('internalConsumptionSubtitle')}</p>
              </div>
            </div>
            {/* Form body */}
            <div className="p-6">
              <InlineRequestForm
                inventoryItems={inventoryItems}
                staffMembers={staffMembers}
                onSuccess={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: t('filterPending'),
              value: pendingCount,
              sub: t('consumptionRequests'),
              color: 'text-amber-600',
              bg: 'bg-amber-50 dark:bg-amber-900/10',
              border: 'border-amber-100 dark:border-amber-900/30',
              dot: 'bg-amber-400',
            },
            {
              label: t('filterApproved'),
              value: approvedCount,
              sub: t('consumptionRequests'),
              color: 'text-emerald-600',
              bg: 'bg-emerald-50 dark:bg-emerald-900/10',
              border: 'border-emerald-100 dark:border-emerald-900/30',
              dot: 'bg-emerald-400',
            },
            {
              label: t('totalCostValue'),
              value: totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
              sub: 'SAR',
              color: 'text-blue-600',
              bg: 'bg-blue-50 dark:bg-blue-900/10',
              border: 'border-blue-100 dark:border-blue-900/30',
              dot: 'bg-blue-400',
            },
          ].map((kpi, i) => (
            <div key={i} className={cn(
              'rounded-2xl border p-4 sm:p-5 flex flex-col gap-2',
              'bg-white dark:bg-gray-900',
              kpi.border
            )}>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', kpi.dot)} />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{kpi.label}</p>
              </div>
              <p className={cn('text-3xl font-black tabular-nums', kpi.color)}>
                {kpi.value}
                {i === 2 && <span className="text-xs ml-1 font-bold text-gray-400">SAR</span>}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterIcon size={14} className="text-gray-400" />
          {filterLabels.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all',
                statusFilter === f.key
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600'
              )}
            >
              {f.label}
              {f.key !== 'ALL' && (
                <span className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]',
                  statusFilter === f.key ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                )}>
                  {requests.filter(r => r.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table Card ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <Package size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-400">{t('noConsumptionRequests')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                      <th className="px-5 py-3.5 font-black text-[10px] uppercase tracking-widest text-gray-400">{t('reqNo')} / {t('date')}</th>
                      <th className="px-5 py-3.5 font-black text-[10px] uppercase tracking-widest text-gray-400">{t('itemAndQty')}</th>
                      <th className="px-5 py-3.5 font-black text-[10px] uppercase tracking-widest text-gray-400 hidden sm:table-cell">{t('employeeReason')}</th>
                      <th className="px-5 py-3.5 font-black text-[10px] uppercase tracking-widest text-gray-400">{t('statusTrail')}</th>
                      {canManage && <th className="px-5 py-3.5 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">{t('actions')}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {paged.map(req => (
                      <tr key={req.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors">
                        <td className="px-5 py-4 align-top">
                          <div className="font-black text-gray-900 dark:text-white text-sm">
                            <span className="text-blue-600 dark:text-blue-400">#</span>{req.id}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-medium tabular-nums">
                            {formatDate(req.createdAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{req.item.name}</div>
                          {editingId === req.id ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <input
                                type="number" step="0.01"
                                className="w-20 px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 font-bold focus:ring-2 focus:ring-blue-500/30"
                                value={editQty}
                                onChange={e => setEditQty(e.target.value)}
                                autoFocus
                              />
                              {loadingAction === req.id ? (
                                <Loader2 size={12} className="animate-spin text-gray-400" />
                              ) : (
                                <>
                                  <button onClick={() => handleSaveEdit(req.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"><Check size={13} /></button>
                                  <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><X size={13} /></button>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                {req.quantity} {req.item.unit}
                              </span>
                              {isSuperAdmin && req.status === 'APPROVED' && (
                                <button
                                  onClick={() => { setEditingId(req.id); setEditQty(req.quantity.toString()) }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-500 transition-all"
                                  title={t('correctQty')}
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1 font-semibold">
                            {(req.quantity * (req.item.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top hidden sm:table-cell">
                          <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{req.staff?.name || req.employeeName || '—'}</div>
                          <div className="text-xs font-semibold text-gray-500 mt-0.5">{req.reason}</div>
                          {req.notes && <div className="text-[10px] text-gray-400 mt-1 italic leading-relaxed">{req.notes}</div>}
                        </td>
                        <td className="px-5 py-4 align-top">
                          {statusBadge(req.status)}
                          <div className="text-[9px] text-gray-400 mt-2 space-y-0.5 font-semibold leading-relaxed">
                            <div>{t('requestBy')} {req.createdBy?.name}</div>
                            {req.status === 'APPROVED' && req.approvedBy && (
                              <div className="text-emerald-600 dark:text-emerald-400">{t('approvedBy')} {req.approvedBy.name}</div>
                            )}
                            {req.status === 'REJECTED' && req.rejectedBy && (
                              <div className="text-red-500 dark:text-red-400">{t('rejectedByLabel')} {req.rejectedBy.name}</div>
                            )}
                            {req.rejectionReason && (
                              <div className="text-gray-400 italic truncate max-w-[140px]">{req.rejectionReason}</div>
                            )}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-5 py-4 align-top text-right">
                            {loadingAction === req.id ? (
                              <div className="flex justify-end"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {req.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(req.id)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg transition-colors"
                                      title={t('approveRequest')}
                                    >
                                      <Check size={11} />{t('approveRequest')}
                                    </button>
                                    <button
                                      onClick={() => handleReject(req.id)}
                                      className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-lg transition-colors"
                                      title={t('rejectRequest')}
                                    >
                                      <X size={13} />
                                    </button>
                                  </>
                                )}
                                {isSuperAdmin && req.status === 'APPROVED' && (
                                  <button
                                    onClick={() => handleReverse(req.id)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/50 dark:border-amber-800/50 rounded-lg transition-colors"
                                    title={t('reverseRequest')}
                                  >
                                    <RotateCcw size={11} />
                                    {locale === 'ar' ? 'عكس' : 'Reverse'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400 font-semibold">
                    {t('showing')} {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} {t('of')} {filtered.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                      {t('previousPage')}
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button
                        key={pg}
                        onClick={() => setCurrentPage(pg)}
                        className={cn(
                          'w-8 h-8 rounded-xl text-xs font-bold border transition-colors',
                          currentPage === pg
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                        )}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      {t('nextPage')}
                      {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
