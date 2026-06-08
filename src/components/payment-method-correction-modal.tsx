'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { correctPaymentMethod } from '@/actions/transactions'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'

type PayMethod = 'CASH' | 'NETWORK' | 'TABBY' | 'TAMARA' | 'CREDIT'

const METHOD_LABELS: Record<PayMethod, string> = {
  CASH: 'Cash',
  NETWORK: 'Network (Card)',
  TABBY: 'Tabby',
  TAMARA: 'Tamara',
  CREDIT: 'Credit',
}

const METHOD_COLORS: Record<PayMethod, string> = {
  CASH:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  NETWORK: 'bg-blue-50 text-blue-700 border-blue-200',
  TABBY:   'bg-purple-50 text-purple-700 border-purple-200',
  TAMARA:  'bg-pink-50 text-pink-700 border-pink-200',
  CREDIT:  'bg-amber-50 text-amber-700 border-amber-200',
}

const ALL_METHODS: PayMethod[] = ['CASH', 'NETWORK', 'TABBY', 'TAMARA']

interface PaymentMethodCorrectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string
  currentMethod: PayMethod
  onCorrected?: () => void
}

export function PaymentMethodCorrectionModal({
  open,
  onOpenChange,
  invoiceNumber,
  currentMethod,
  onCorrected,
}: PaymentMethodCorrectionModalProps) {
  const [newMethod, setNewMethod] = useState<PayMethod | ''>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const availableMethods = ALL_METHODS.filter(m => m !== currentMethod)

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
    if (!reason.trim()) { setError('A reason is required.'); return }

    setLoading(true)
    setError(null)
    try {
      await correctPaymentMethod({
        invoiceNumber,
        newMethod: newMethod as PayMethod,
        reason,
      })
      setDone(true)
      toast.success(`Payment method corrected: ${METHOD_LABELS[currentMethod]} → ${METHOD_LABELS[newMethod as PayMethod]}`)
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
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white">
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600" />

        <div className="p-7 space-y-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                <RefreshCw size={20} className="text-indigo-600" strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-gray-900 leading-tight">
                  Correct Payment Method
                </DialogTitle>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  Invoice {invoiceNumber}
                </p>
              </div>
            </div>
          </DialogHeader>

          {done ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <p className="font-black text-gray-800">Correction Saved</p>
              <p className="text-sm text-gray-400 text-center">
                {METHOD_LABELS[currentMethod]} → {newMethod ? METHOD_LABELS[newMethod as PayMethod] : ''}
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
                <div className="flex-1 h-px bg-gray-100" />
                <ArrowRight size={16} className="text-indigo-400" strokeWidth={2.5} />
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* ── New method selector ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {availableMethods.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewMethod(m)}
                      className={`
                        h-11 rounded-xl border-2 font-black text-sm transition-all duration-150
                        ${newMethod === m
                          ? `${METHOD_COLORS[m]} border-current shadow-sm scale-[1.02]`
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-white'
                        }
                      `}
                    >
                      {METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Reason field ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => { setReason(e.target.value); setError(null) }}
                  placeholder="e.g. Cashier selected wrong payment method at checkout"
                  rows={3}
                  className="w-full text-sm text-gray-800 placeholder:text-gray-300 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* ── Warning banner ── */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-[11px] font-medium text-amber-700 leading-snug">
                  This will update the shift totals and create a permanent audit record. The settlement history is not modified.
                </p>
              </div>

              {/* ── Error ── */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-3">
                  <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-[11px] font-bold text-rose-700 leading-snug">{error}</p>
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !newMethod || !reason.trim()}
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
