'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { retryBnplSession, manuallyConfirmBnplPayment } from '@/actions/bnpl'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronRight, ExternalLink, ShieldCheck, RotateCcw, Wifi
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type BnplStatus = 'PENDING_PAYMENT' | 'PAYMENT_LINK_SENT' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED'

interface Session {
  id: string
  provider: 'TABBY' | 'TAMARA'
  status: BnplStatus
  amount: number
  invoiceNumber: string
  customerPhone: string
  customerName: string | null
  checkoutUrl: string | null
  failureReason: string | null
  webhookPayload: any
  paidAt: Date | null
  expiresAt: Date
  createdAt: Date
  recordedBy: { name: string } | null
}

const STATUS_CONFIG: Record<BnplStatus, { label: string; labelAr: string; cls: string; icon: any }> = {
  PENDING_PAYMENT: { label: 'Pending',    labelAr: 'معلّق',       cls: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Clock },
  PAYMENT_LINK_SENT: { label: 'Link Sent', labelAr: 'تم الإرسال', cls: 'bg-blue-50 text-blue-700 border-blue-200',      icon: ExternalLink },
  PAID:           { label: 'Paid ✓',     labelAr: 'مدفوع',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  FAILED:         { label: 'Failed',     labelAr: 'فشل',          cls: 'bg-red-50 text-red-700 border-red-200',           icon: XCircle },
  EXPIRED:        { label: 'Expired',    labelAr: 'منتهي',        cls: 'bg-gray-100 text-gray-600 border-gray-200',       icon: Clock },
  CANCELLED:      { label: 'Cancelled',  labelAr: 'ملغي',         cls: 'bg-gray-100 text-gray-500 border-gray-200',       icon: XCircle },
}

const PENDING_STATUSES: BnplStatus[] = ['PENDING_PAYMENT', 'PAYMENT_LINK_SENT']

export function BnplAdminClient({ sessions: initialSessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'TABBY' | 'TAMARA'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | BnplStatus>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isPending, startTransition] = useTransition()

  const pendingCount = sessions.filter(s => PENDING_STATUSES.includes(s.status)).length

  // ── Auto-refresh pending sessions every 8 seconds ────────────────────────
  const pollPending = useCallback(async () => {
    const pending = sessions.filter(s => PENDING_STATUSES.includes(s.status))
    if (pending.length === 0) return

    for (const s of pending) {
      try {
        const res = await fetch(`/api/bnpl/status/${s.id}`)
        if (!res.ok) continue
        const data = await res.json()
        if (data.status !== s.status) {
          setSessions(prev =>
            prev.map(p => p.id === s.id ? { ...p, status: data.status, paidAt: data.paidAt } : p)
          )
          if (data.status === 'PAID') {
            toast.success(`✅ ${s.provider} payment confirmed — ${s.invoiceNumber}`, { duration: 6000 })
          }
        }
      } catch { /* silent */ }
    }
    setLastRefresh(new Date())
  }, [sessions])

  useEffect(() => {
    const t = setInterval(pollPending, 8000)
    return () => clearInterval(t)
  }, [pollPending])

  const filtered = sessions.filter(s => {
    if (providerFilter !== 'ALL' && s.provider !== providerFilter) return false
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
    return true
  })

  const stats = {
    total: sessions.length,
    paid: sessions.filter(s => s.status === 'PAID').length,
    pending: pendingCount,
    failed: sessions.filter(s => ['FAILED', 'EXPIRED'].includes(s.status)).length,
    revenue: sessions.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.amount, 0),
  }

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await retryBnplSession(id)
      toast.success('Payment SMS re-sent!')
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'PAYMENT_LINK_SENT' } : s))
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`)
    } finally {
      setRetrying(null)
    }
  }

  // ── Admin manual confirm ──────────────────────────────────────────────────
  const handleManualConfirm = async (s: Session) => {
    const ok = window.confirm(
      `⚠️ Manual Payment Confirmation\n\n` +
      `Invoice: ${s.invoiceNumber}\n` +
      `Provider: ${s.provider}\n` +
      `Amount: ${s.amount.toFixed(2)} SAR\n` +
      `Customer: ${s.customerName || s.customerPhone}\n\n` +
      `ONLY confirm if you have physically verified the customer ` +
      `completed payment in the ${s.provider} app.\n\n` +
      `This action is logged and audited. Proceed?`
    )
    if (!ok) return

    setConfirming(s.id)
    try {
      const result = await manuallyConfirmBnplPayment(s.id)
      if (result.ok) {
        setSessions(prev => prev.map(p => p.id === s.id ? { ...p, status: 'PAID', paidAt: new Date() } : p))
        toast.success(`✅ Payment confirmed — Invoice ${s.invoiceNumber} recorded`)
        startTransition(() => router.refresh())
      } else {
        toast.error(`Failed: ${result.error}`)
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setConfirming(null)
    }
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Admin Dashboard</p>
          <h1 className="text-3xl font-extrabold tracking-tight">BNPL Payment Sessions</h1>
          <p className="text-gray-500 text-sm mt-1">Tabby & Tamara — سجلات مدفوعات التقسيط</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {pendingCount} pending · being monitored
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
            <Wifi size={10} />
            Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions',    value: stats.total,   cls: 'text-gray-900' },
          { label: 'Completed · مكتمل', value: stats.paid,    cls: 'text-emerald-600' },
          { label: 'Pending · معلّق',   value: stats.pending, cls: 'text-amber-600' },
          { label: 'Failed / Expired',  value: stats.failed,  cls: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={cn('text-3xl font-black tabular-nums mt-1', s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm font-bold opacity-70">Total BNPL Revenue Collected · إجمالي المبيعات</p>
        <p className="text-4xl font-black tabular-nums mt-1">
          {stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
          <span className="text-lg opacity-60">SAR</span>
        </p>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">
              {pendingCount} session{pendingCount > 1 ? 's' : ''} waiting for customer payment
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              This page auto-monitors them every 8 seconds. If the customer paid and the status hasn't updated,
              use <strong>Confirm Paid</strong> after physically verifying with the customer.
              هذه الصفحة تراقب الجلسات المعلقة تلقائياً.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'TABBY', 'TAMARA'] as const).map(p => (
          <button key={p} onClick={() => setProviderFilter(p)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
              providerFilter === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
            {p}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(['ALL', 'PAID', 'PAYMENT_LINK_SENT', 'PENDING_PAYMENT', 'FAILED', 'EXPIRED', 'CANCELLED'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
              statusFilter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
            {s === 'ALL' ? 'All Statuses' : STATUS_CONFIG[s as BnplStatus]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Provider', 'Invoice', 'Customer', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-300 text-sm">No sessions found</td></tr>
              ) : filtered.map(s => {
                const statusCfg = STATUS_CONFIG[s.status]
                const StatusIcon = statusCfg.icon
                const isExpanded = expandedId === s.id
                const isPending = PENDING_STATUSES.includes(s.status)
                return [
                  <tr key={s.id}
                    className={cn('hover:bg-gray-50 transition-colors cursor-pointer',
                      isExpanded && 'bg-blue-50/30',
                      isPending && 'border-l-2 border-l-amber-400'
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-lg text-[10px] font-black uppercase',
                        s.provider === 'TABBY' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700')}>
                        {s.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{s.customerName || '—'}</p>
                      <p className="text-xs text-gray-400">{s.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 font-black tabular-nums text-gray-900">
                      {s.amount.toFixed(2)} <span className="text-[10px] text-gray-400">SAR</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border', statusCfg.cls)}>
                        {isPending
                          ? <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '2s' }} />
                          : <StatusIcon size={10} />
                        }
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <p>{format(new Date(s.createdAt), 'MMM d, h:mm a')}</p>
                      {isPending && (
                        <p className="text-[10px] text-amber-500 font-bold">
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>

                        {/* ── Manual Confirm (pending sessions only) ── */}
                        {isPending && (
                          <button
                            onClick={() => handleManualConfirm(s)}
                            disabled={confirming === s.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 shadow-sm"
                            title="Manually confirm payment (admin only)"
                          >
                            {confirming === s.id
                              ? <RefreshCw size={11} className="animate-spin" />
                              : <ShieldCheck size={11} />
                            }
                            {confirming === s.id ? 'Confirming...' : 'Confirm Paid'}
                          </button>
                        )}

                        {/* ── Retry / Resend SMS ── */}
                        {['FAILED', 'EXPIRED', 'CANCELLED', 'PAYMENT_LINK_SENT'].includes(s.status) && (
                          <button
                            onClick={() => handleRetry(s.id)}
                            disabled={retrying === s.id}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Retry / Resend SMS"
                          >
                            <RotateCcw size={12} className={retrying === s.id ? 'animate-spin' : ''} />
                          </button>
                        )}

                        {isExpanded
                          ? <ChevronDown size={14} className="text-gray-400 ml-1" />
                          : <ChevronRight size={14} className="text-gray-400 ml-1" />
                        }
                      </div>
                    </td>
                  </tr>,

                  /* ── Expanded detail row ── */
                  isExpanded && (
                    <tr key={`${s.id}-detail`} className="bg-blue-50/20">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cashier</p>
                              <p className="text-sm font-bold text-gray-700">{s.recordedBy?.name || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Session Expires</p>
                              <p className="text-sm font-bold text-gray-700">{format(new Date(s.expiresAt), 'PPp')}</p>
                            </div>
                            {s.paidAt && (
                              <div>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1">Paid At</p>
                                <p className="text-sm font-bold text-emerald-700">{format(new Date(s.paidAt), 'PPp')}</p>
                              </div>
                            )}
                          </div>

                          {s.failureReason && (
                            <div>
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Failure Reason</p>
                              <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{s.failureReason}</p>
                            </div>
                          )}

                          {s.webhookPayload && (
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
                                Webhook / Confirm Payload
                              </p>
                              <pre className="text-[10px] text-gray-600 bg-gray-100 rounded-xl p-3 overflow-x-auto max-h-40">
                                {JSON.stringify(s.webhookPayload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
