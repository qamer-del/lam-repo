'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getAgents } from '@/actions/agents'
import { correctPurchasePaymentMethod } from '@/actions/inventory'
import { Agent } from '@prisma/client'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, CheckCircle2, DollarSign, Loader2, RefreshCw, Wifi, Users, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Inline supplier picker ──────────────────────────────────────────────────────
function SupplierPicker({
  agents,
  selectedId,
  onSelect,
  placeholder,
}: {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = agents.find(a => String(a.id) === selectedId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full mt-2 text-left">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between h-14 rounded-xl border-2 px-4 text-sm font-bold transition-all bg-gray-50/50 dark:bg-gray-900',
          open
            ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
            : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300'
        )}
      >
        <span className={cn('flex items-center gap-2.5 truncate', !selected && 'text-gray-400 font-medium')}>
          <Users size={16} className="text-indigo-500 shrink-0" />
          {selected ? (selected.companyName ? `${selected.name} (${selected.companyName})` : selected.name) : placeholder}
        </span>
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-850 shadow-2xl overflow-hidden max-h-60 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onSelect(null); setOpen(false) }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition group border-b border-gray-50 dark:border-gray-900/50"
          >
            <span className="text-sm font-medium text-gray-400 italic">No Representative</span>
          </button>
          {agents.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onSelect(String(a.id)); setOpen(false) }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition group border-b border-gray-50 dark:border-gray-900/50 last:border-0"
            >
              <div className="min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{a.name}</p>
                {a.companyName && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{a.companyName}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type PurchasePayMethod = 'CASH' | 'NETWORK' | 'CREDIT'

const METHOD_LABELS: Record<PurchasePayMethod, string> = {
  CASH: 'Cash',
  NETWORK: 'Network (Card)',
  CREDIT: 'Credit (Supplier)',
}

const METHOD_COLORS: Record<PurchasePayMethod, string> = {
  CASH:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900',
  NETWORK: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900',
  CREDIT:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900',
}

const METHOD_ICONS: Record<PurchasePayMethod, React.ComponentType<{ size?: number; className?: string }>> = {
  CASH: DollarSign,
  NETWORK: Wifi,
  CREDIT: Users,
}

const ALL_PURCHASE_METHODS: PurchasePayMethod[] = ['CASH', 'NETWORK', 'CREDIT']

interface PurchasePaymentCorrectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrderId: number
  currentMethod: PurchasePayMethod
  supplierName?: string | null
  hasSupplier: boolean
  onCorrected?: () => void
}

export function PurchasePaymentCorrectionModal({
  open,
  onOpenChange,
  purchaseOrderId,
  currentMethod,
  supplierName,
  hasSupplier,
  onCorrected,
}: PurchasePaymentCorrectionModalProps) {
  const [newMethod, setNewMethod] = useState<PurchasePayMethod | ''>('')
  const [newAgentId, setNewAgentId] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Fetch agents on mount
  useEffect(() => {
    if (!open) return
    let isMounted = true
    setAgentsLoading(true)
    getAgents().then(data => {
      if (isMounted) setAgents(data)
    }).catch(err => {
      console.error('Failed to fetch agents', err)
    }).finally(() => {
      if (isMounted) setAgentsLoading(false)
    })
    return () => { isMounted = false }
  }, [open])

  // CREDIT requires a supplier — if we don't have one, user must select one using the picker
  const availableMethods = ALL_PURCHASE_METHODS.filter(m => m !== currentMethod)

  function reset() {
    setNewMethod('')
    setReason('')
    setError(null)
    setDone(false)
    setLoading(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function handleSubmit() {
    if (!newMethod) { setError('Please select a new payment method.'); return }
    if (newMethod === 'CREDIT' && !hasSupplier && !newAgentId) {
      setError('A representative is required for CREDIT purchases.')
      return
    }
    if (!reason.trim()) { setError('A reason is required.'); return }

    setLoading(true)
    setError(null)
    try {
      await correctPurchasePaymentMethod({
        purchaseOrderId,
        newMethod: newMethod as PurchasePayMethod,
        newAgentId: newAgentId ? parseInt(newAgentId) : undefined,
        reason,
      })
      setDone(true)
      toast.success(
        `Purchase payment method corrected: ${METHOD_LABELS[currentMethod]} → ${METHOD_LABELS[newMethod as PurchasePayMethod]}`
      )
      onCorrected?.()
      setTimeout(() => handleOpenChange(false), 1800)
    } catch (err: any) {
      setError(err?.message || 'Correction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white dark:bg-gray-950">
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600" />

        <div className="p-7 space-y-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shadow-sm shrink-0">
                <RefreshCw size={20} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                  Correct Purchase Payment
                </DialogTitle>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  PO #{purchaseOrderId}
                  {supplierName && <> · {supplierName}</>}
                </p>
              </div>
            </div>
          </DialogHeader>

          {done ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <p className="font-black text-gray-800 dark:text-white">Correction Saved</p>
              <p className="text-sm text-gray-400 text-center">
                {METHOD_LABELS[currentMethod]} → {newMethod ? METHOD_LABELS[newMethod as PurchasePayMethod] : ''}
              </p>
            </div>
          ) : (
            <>
              {/* ── Current method display ── */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Method</p>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-black ${METHOD_COLORS[currentMethod]}`}>
                  {METHOD_LABELS[currentMethod]}
                </div>
              </div>

              {/* ── Arrow ── */}
              <div className="flex items-center gap-2 text-gray-300">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <ArrowRight size={16} className="text-indigo-400" strokeWidth={2.5} />
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              {/* ── New method selector ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {availableMethods.map(m => {
                    const Icon = METHOD_ICONS[m]
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setNewMethod(m); setError(null) }}
                        className={`
                          h-14 rounded-xl border-2 font-black text-xs transition-all duration-150 flex flex-col items-center justify-center gap-1
                          ${newMethod === m
                            ? `${METHOD_COLORS[m]} border-current shadow-sm scale-[1.03]`
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 hover:bg-white dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <Icon size={16} />
                        {m}
                      </button>
                    )
                  })}
                </div>

                {newMethod === 'CREDIT' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      Representative / Agent <span className="text-amber-500">*</span>
                    </p>
                    <SupplierPicker
                      agents={agents}
                      selectedId={newAgentId}
                      onSelect={setNewAgentId}
                      placeholder={hasSupplier ? (supplierName || 'Select different representative...') : "Select a representative..."}
                    />
                    {!hasSupplier && !newAgentId && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-2">
                        You must select a representative to convert this purchase to Credit.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Reason field ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => { setReason(e.target.value); setError(null) }}
                  placeholder="e.g. Wrong payment method selected at time of purchase"
                  rows={3}
                  className="w-full text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* ── Warning banner ── */}
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-xl px-3.5 py-3">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-snug">
                  This will update the supplier balance and financial reports. A permanent audit record will be created.
                </p>
              </div>

              {/* ── Error ── */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-xl px-3.5 py-3">
                  <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 leading-snug">{error}</p>
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !newMethod || !reason.trim() || (newMethod === 'CREDIT' && !hasSupplier && !newAgentId)}
                  className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  ) : (
                    <>Confirm Correction</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
