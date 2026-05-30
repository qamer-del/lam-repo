'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Plus, Check, X, Pencil, RotateCcw, Loader2, Package, ChevronLeft, ChevronRight, FilterIcon } from 'lucide-react'
import { CreateConsumptionModal } from './create-consumption-modal'
import { approveConsumptionRequest, rejectConsumptionRequest, reverseConsumptionRequest, editConsumptionRequest } from '@/actions/inventory-consumption'
import { toast } from 'sonner'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const PAGE_SIZE = 10

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

  const [modalOpen, setModalOpen] = useState(false)
  const [loadingAction, setLoadingAction] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  const isCashier = userRole === 'CASHIER'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const canManage = !isCashier

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
    } finally {
      setLoadingAction(null)
    }
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
    } finally {
      setLoadingAction(null)
    }
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
    } finally {
      setLoadingAction(null)
    }
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
    } finally {
      setLoadingAction(null)
    }
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
      {/* Header */}
      <div className="border-b border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('internalConsumption')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('internalConsumptionSubtitle')}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus size={16} />
            {t('newRequest')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* KPI Cards */}
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

        {/* Filters */}
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

        {/* Table Card */}
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
                        {/* Req # / Date */}
                        <td className="px-5 py-4 align-top">
                          <div className="font-black text-gray-900 dark:text-white text-sm">
                            <span className="text-blue-600 dark:text-blue-400">#</span>{req.id}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-medium tabular-nums">
                            {formatDate(req.createdAt)}
                          </div>
                        </td>

                        {/* Item & Qty */}
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{req.item.name}</div>
                          {editingId === req.id ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <input
                                type="number"
                                step="0.01"
                                className="w-20 px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 font-bold focus:ring-2 focus:ring-blue-500/30"
                                value={editQty}
                                onChange={e => setEditQty(e.target.value)}
                                autoFocus
                              />
                              {loadingAction === req.id ? (
                                <Loader2 size={12} className="animate-spin text-gray-400" />
                              ) : (
                                <>
                                  <button onClick={() => handleSaveEdit(req.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                                    <Check size={13} />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                    <X size={13} />
                                  </button>
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

                        {/* Employee / Reason */}
                        <td className="px-5 py-4 align-top hidden sm:table-cell">
                          <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                            {req.staff?.name || req.employeeName || '—'}
                          </div>
                          <div className="text-xs font-semibold text-gray-500 mt-0.5">{req.reason}</div>
                          {req.notes && (
                            <div className="text-[10px] text-gray-400 mt-1 italic leading-relaxed">{req.notes}</div>
                          )}
                        </td>

                        {/* Status */}
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

                        {/* Actions */}
                        {canManage && (
                          <td className="px-5 py-4 align-top text-right">
                            {loadingAction === req.id ? (
                              <div className="flex justify-end">
                                <Loader2 size={16} className="animate-spin text-gray-400" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {req.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(req.id)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg transition-colors"
                                      title={t('approveRequest')}
                                    >
                                      <Check size={11} />
                                      {t('approveRequest')}
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

      <CreateConsumptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        inventoryItems={inventoryItems}
        staffMembers={staffMembers}
      />
    </div>
  )
}
