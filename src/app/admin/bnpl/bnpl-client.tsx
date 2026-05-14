'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { retryBnplSession } from '@/actions/bnpl'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  Filter, ChevronDown, ChevronRight, ExternalLink
} from 'lucide-react'

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

const STATUS_CONFIG: Record<BnplStatus, { label: string; cls: string; icon: any }> = {
  PENDING_PAYMENT: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  PAYMENT_LINK_SENT: { label: 'Link Sent', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: ExternalLink },
  PAID: { label: 'Paid ✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  FAILED: { label: 'Failed', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  EXPIRED: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
}

export function BnplAdminClient({ sessions }: { sessions: Session[] }) {
  const [providerFilter, setProviderFilter] = useState<'ALL' | 'TABBY' | 'TAMARA'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | BnplStatus>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  const filtered = sessions.filter(s => {
    if (providerFilter !== 'ALL' && s.provider !== providerFilter) return false
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
    return true
  })

  const stats = {
    total: sessions.length,
    paid: sessions.filter(s => s.status === 'PAID').length,
    pending: sessions.filter(s => ['PENDING_PAYMENT', 'PAYMENT_LINK_SENT'].includes(s.status)).length,
    failed: sessions.filter(s => ['FAILED', 'EXPIRED'].includes(s.status)).length,
    revenue: sessions.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.amount, 0),
  }

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await retryBnplSession(id)
      toast.success('Payment SMS re-sent!')
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`)
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Admin Dashboard</p>
        <h1 className="text-3xl font-extrabold tracking-tight">BNPL Payment Logs</h1>
        <p className="text-gray-500 text-sm mt-1">Tabby & Tamara payment sessions — سجلات المدفوعات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: stats.total, cls: 'text-gray-900' },
          { label: 'Completed', value: stats.paid, cls: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, cls: 'text-amber-600' },
          { label: 'Failed / Expired', value: stats.failed, cls: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className={cn('text-3xl font-black tabular-nums mt-1', s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm font-bold opacity-70">Total BNPL Revenue Collected</p>
        <p className="text-4xl font-black tabular-nums mt-1">
          {stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-lg opacity-60">SAR</span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'TABBY', 'TAMARA'] as const).map(p => (
          <button
            key={p}
            onClick={() => setProviderFilter(p)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
              providerFilter === p
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            )}
          >
            {p}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(['ALL', 'PAID', 'PAYMENT_LINK_SENT', 'PENDING_PAYMENT', 'FAILED', 'EXPIRED', 'CANCELLED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
              statusFilter === s
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            )}
          >
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
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-300 text-sm">
                    No sessions found
                  </td>
                </tr>
              ) : filtered.map(s => {
                const statusCfg = STATUS_CONFIG[s.status]
                const StatusIcon = statusCfg.icon
                const isExpanded = expandedId === s.id
                return [
                  <tr
                    key={s.id}
                    className={cn('hover:bg-gray-50 transition-colors cursor-pointer', isExpanded && 'bg-blue-50/30')}
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-black uppercase',
                        s.provider === 'TABBY' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'
                      )}>
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
                        <StatusIcon size={10} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(s.createdAt), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {['FAILED', 'EXPIRED', 'CANCELLED', 'PAYMENT_LINK_SENT'].includes(s.status) && (
                          <button
                            onClick={() => handleRetry(s.id)}
                            disabled={retrying === s.id}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Retry / Resend Link"
                          >
                            <RefreshCw size={12} className={retrying === s.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                        {s.checkoutUrl && (
                          <a
                            href={s.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            title="Open Payment Link"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {isExpanded ? <ChevronDown size={14} className="text-gray-400 ml-1" /> : <ChevronRight size={14} className="text-gray-400 ml-1" />}
                      </div>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${s.id}-detail`} className="bg-blue-50/20">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-3">
                          {s.checkoutUrl && (
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Payment URL</p>
                              <a href={s.checkoutUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline font-mono break-all">
                                {s.checkoutUrl}
                              </a>
                            </div>
                          )}
                          {s.failureReason && (
                            <div>
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Failure Reason</p>
                              <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{s.failureReason}</p>
                            </div>
                          )}
                          {s.paidAt && (
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Paid At</p>
                              <p className="text-xs text-emerald-700 font-bold">{format(new Date(s.paidAt), 'PPpp')}</p>
                            </div>
                          )}
                          {s.webhookPayload && (
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Webhook Payload</p>
                              <pre className="text-[10px] text-gray-600 bg-gray-100 rounded-xl p-3 overflow-x-auto max-h-40">
                                {JSON.stringify(s.webhookPayload, null, 2)}
                              </pre>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400">
                            Recorded by: <span className="font-bold">{s.recordedBy?.name || 'Unknown'}</span>
                            &nbsp;·&nbsp; Expires: {format(new Date(s.expiresAt), 'PPpp')}
                          </p>
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
