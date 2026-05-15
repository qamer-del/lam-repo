'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { manuallyConfirmBnplPayment } from '@/actions/bnpl'
import { toast } from 'sonner'
import { Clock, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface PendingSession {
  id: string
  provider: 'TABBY' | 'TAMARA'
  amount: number
  customerName: string | null
  customerPhone: string
  invoiceNumber: string
  createdAt: string
  status: string
}

interface BnplPendingPanelProps {
  shiftId?: number | null
  userRole?: string
  onPaymentConfirmed?: (invoiceNumber: string) => void
}

const PROVIDER_COLORS = {
  TABBY: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  TAMARA: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
}

export function BnplPendingPanel({ shiftId, userRole, onPaymentConfirmed }: BnplPendingPanelProps) {
  const [sessions, setSessions] = useState<PendingSession[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const isAdmin = ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(userRole || '')

  // ── Fetch pending sessions for current shift ──────────────────────────────
  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/bnpl/pending')
      if (!res.ok) return
      const data: PendingSession[] = await res.json()
      // Filter out dismissed ones
      setSessions(prev => {
        const filtered = data.filter(s => !dismissed.has(s.id))
        // Check if any newly turned PAID (poll found them)
        return filtered
      })
    } catch {
      // silent
    }
  }, [dismissed])

  // ── Poll each visible pending session for status change ──────────────────
  const pollSessions = useCallback(async (currentSessions: PendingSession[]) => {
    for (const s of currentSessions) {
      try {
        const res = await fetch(`/api/bnpl/status/${s.id}`)
        if (!res.ok) continue
        const data = await res.json()
        if (data.status === 'PAID') {
          setSessions(prev => prev.filter(p => p.id !== s.id))
          toast.success(`✅ ${s.provider} payment confirmed — Invoice ${s.invoiceNumber}`, { duration: 6000 })
          onPaymentConfirmed?.(s.invoiceNumber)
        } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(data.status)) {
          setSessions(prev => prev.filter(p => p.id !== s.id))
        }
      } catch {
        // silent
      }
    }
  }, [onPaymentConfirmed])

  useEffect(() => {
    fetchPending()
    pollRef.current = setInterval(async () => {
      await fetchPending()
    }, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchPending])

  // Also poll each session's status
  useEffect(() => {
    if (sessions.length === 0) return
    const t = setInterval(() => pollSessions(sessions), 5000)
    return () => clearInterval(t)
  }, [sessions, pollSessions])

  // ── Manual confirm (admin only) ───────────────────────────────────────────
  const handleManualConfirm = async (sessionId: string, invoiceNumber: string, provider: string) => {
    const ok = window.confirm(
      `⚠️ Manual Payment Confirmation\n\n` +
      `Invoice: ${invoiceNumber}\nProvider: ${provider}\n\n` +
      `ONLY confirm if you have physically verified the customer completed payment in the ${provider} app.\n\n` +
      `This action is logged and audited. Proceed?`
    )
    if (!ok) return

    setConfirming(sessionId)
    try {
      const result = await manuallyConfirmBnplPayment(sessionId)
      if (result.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        toast.success(`Payment manually confirmed — ${invoiceNumber}`)
        onPaymentConfirmed?.(invoiceNumber)
      } else {
        toast.error(`Confirm failed: ${result.error}`)
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setConfirming(null)
    }
  }

  const handleDismiss = (sessionId: string) => {
    setDismissed(prev => new Set([...prev, sessionId]))
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }

  if (sessions.length === 0) return null

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Clock size={16} className="text-amber-600" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
              {sessions.length}
            </span>
          </div>
          <span className="text-xs font-black text-amber-800 uppercase tracking-widest">
            Pending BNPL Payments · دفعات معلقة
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Monitoring
          </span>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />}
      </button>

      {/* Sessions list */}
      {isExpanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {sessions.map(s => {
            const colors = PROVIDER_COLORS[s.provider]
            const isConfirming = confirming === s.id
            return (
              <div key={s.id} className="px-4 py-3 space-y-2.5">
                {/* Session info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', colors.badge)}>
                        {s.provider}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-gray-500">{s.invoiceNumber}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-gray-900 tabular-nums">
                        {s.amount.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">SAR</span>
                      </span>
                      {s.customerName && (
                        <span className="text-xs font-bold text-gray-600 truncate">{s.customerName}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-gray-400">{s.customerPhone}</p>
                  </div>

                  {/* Spinner — monitoring */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <RefreshCw size={12} className="text-amber-500 animate-spin" style={{ animationDuration: '2s' }} />
                    <span className="text-[10px] text-amber-600 font-bold">Waiting...</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* Admin-only manual confirm */}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleManualConfirm(s.id, s.invoiceNumber, s.provider)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                      {isConfirming ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={11} />
                      )}
                      {isConfirming ? 'Confirming...' : 'Confirm Paid · تأكيد الدفع'}
                    </button>
                  )}

                  {/* Admin badge if not admin (info only) */}
                  {!isAdmin && (
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold px-2 py-1 rounded-lg bg-gray-100">
                      <ShieldAlert size={10} />
                      Contact manager to confirm manually
                    </div>
                  )}

                  {/* Dismiss */}
                  <button
                    type="button"
                    onClick={() => handleDismiss(s.id)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-400 text-[10px] font-bold hover:bg-gray-100 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-1.5 bg-white/60 rounded-xl px-2.5 py-1.5">
                  <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-700 font-medium leading-tight">
                    This session is being monitored automatically. The sale will be recorded as soon as the customer completes payment.
                    إذا أتم العميل الدفع، سيُسجَّل البيع تلقائياً.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
