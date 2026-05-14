'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBnplSession, cancelBnplSession, CartItem } from '@/actions/bnpl'
import { toast } from 'sonner'
import {
  X, Phone, Loader2, CheckCircle2, XCircle,
  Clock, RefreshCw, AlertTriangle, Smartphone, MessageSquare, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface BnplCheckoutModalProps {
  provider: 'TABBY' | 'TAMARA'
  amount: number
  cart: CartItem[]
  customerName?: string
  customerId?: number
  onSuccess: (invoiceNumber: string) => void
  onCancel: () => void
}

type BnplStatus = 'PENDING_PAYMENT' | 'PAYMENT_LINK_SENT' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED'

// ── Tabby rejection code → bilingual message ─────────────────────────────────

function getBnplDeclineMessage(code: string, provider: 'TABBY' | 'TAMARA') {
  const providerName = provider === 'TABBY' ? 'Tabby / تابي' : 'Tamara / تمارا'
  const messages: Record<string, { en: string; ar: string; tip: string; tipAr: string }> = {
    not_available: {
      en: `${providerName} is not available for this customer`,
      ar: 'الخدمة غير متاحة لهذا العميل حالياً',
      tip: 'The customer may not have a registered account or may not be in a supported region.',
      tipAr: 'قد لا يكون العميل مسجلاً أو أن المنطقة غير مدعومة.',
    },
    order_amount_too_high: {
      en: 'Purchase amount exceeds the customer\'s credit limit',
      ar: 'المبلغ أعلى من الحد الائتماني للعميل',
      tip: 'Try splitting the order or use a different payment method.',
      tipAr: 'حاول تقسيم الطلب أو استخدام طريقة دفع أخرى.',
    },
    order_amount_too_low: {
      en: 'Purchase amount is below the minimum for installments',
      ar: 'المبلغ أقل من الحد الأدنى للأقساط',
      tip: 'Add more items to meet the minimum order requirement.',
      tipAr: 'أضف المزيد من المنتجات للوصول إلى الحد الأدنى.',
    },
    unconfirmed_limits: {
      en: 'Customer credit limits have not been confirmed yet',
      ar: 'لم يتم تأكيد حدود الائتمان للعميل بعد',
      tip: 'Customer needs to complete their profile on the app first.',
      tipAr: 'يحتاج العميل إلى إكمال ملفه الشخصي في التطبيق أولاً.',
    },
    rejected: {
      en: 'Customer application was declined by the credit engine',
      ar: 'تم رفض طلب العميل من قِبل نظام الائتمان',
      tip: 'The customer does not meet the eligibility criteria at this time.',
      tipAr: 'لا يستوفي العميل شروط الأهلية في الوقت الحالي.',
    },
    too_many_active_sessions: {
      en: 'Customer has too many active payment sessions',
      ar: 'لدى العميل عدد كبير من جلسات الدفع النشطة',
      tip: 'Ask the customer to complete or cancel their pending payments first.',
      tipAr: 'اطلب من العميل إتمام أو إلغاء مدفوعاته المعلقة أولاً.',
    },
  }

  return messages[code] || {
    en: `${providerName} declined this transaction`,
    ar: 'رفضت الخدمة هذه المعاملة',
    tip: 'Please try a different payment method or contact the provider.',
    tipAr: 'يرجى استخدام طريقة دفع أخرى أو التواصل مع مزود الخدمة.',
  }
}

// ── Provider Branding ────────────────────────────────────────────────────────

const PROVIDER_CONFIG = {
  TABBY: {
    name: 'Tabby',
    nameAr: 'تابي',
    tagline: '4 interest-free installments',
    taglineAr: 'ادفع على 4 أقساط بدون فوائد',
    gradient: 'from-[#3D0C11] to-[#3D0C11]',
    gradientCard: 'from-purple-600 to-indigo-700',
    accent: 'purple',
    smsCopy: 'Tabby will send an SMS payment link to the customer\'s phone',
    smsCopyAr: 'تابي ستُرسل رابط الدفع عبر رسالة SMS للعميل',
    logo: '🛍️',
    color: '#3D0C11',
    lightBg: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-700',
  },
  TAMARA: {
    name: 'Tamara',
    nameAr: 'تمارا',
    tagline: '3 easy installments',
    taglineAr: 'قسّم إلى 3 دفعات سهلة',
    gradient: 'from-[#009E82] to-[#007A65]',
    gradientCard: 'from-teal-600 to-emerald-700',
    accent: 'teal',
    smsCopy: 'Tamara will send an SMS payment link directly to the customer\'s phone',
    smsCopyAr: 'تمارا ستُرسل رابط الدفع مباشرةً عبر رسالة SMS للعميل',
    logo: '💳',
    color: '#009E82',
    lightBg: 'bg-teal-50 border-teal-200',
    textColor: 'text-teal-700',
  },
}

// ── Animated Pulse Dots ───────────────────────────────────────────────────────
function WaitingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export function BnplCheckoutModal({
  provider,
  amount,
  cart,
  customerName,
  customerId,
  onSuccess,
  onCancel,
}: BnplCheckoutModalProps) {
  const cfg = PROVIDER_CONFIG[provider]

  const [step, setStep] = useState<'phone' | 'waiting' | 'done' | 'declined'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)
  const [status, setStatus] = useState<BnplStatus>('PENDING_PAYMENT')
  const [elapsed, setElapsed] = useState(0)
  const [declineCode, setDeclineCode] = useState<string>('not_available')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 'waiting') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step])

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  // ── Poll status ────────────────────────────────────────────────────────────
  const pollStatus = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/bnpl/status/${sid}`)
      if (!res.ok) return
      const data = await res.json()
      setStatus(data.status)

      if (data.status === 'PAID') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        if (timerRef.current) clearInterval(timerRef.current)
        setStep('done')
        toast.success('Payment confirmed! Invoice created.')
        setTimeout(() => onSuccess(data.invoiceNumber), 2200)
      } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(data.status)) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        if (timerRef.current) clearInterval(timerRef.current)
        setStep('done')
      }
    } catch {
      // ignore polling errors
    }
  }, [onSuccess])

  useEffect(() => {
    if (step === 'waiting' && sessionId) {
      pollingRef.current = setInterval(() => pollStatus(sessionId), 5000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [step, sessionId, pollStatus])

  // ── Start BNPL session ─────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^00/, '+')
    if (!cleaned || cleaned.replace(/\D/g, '').length < 9) {
      toast.error('Please enter a valid phone number — أدخل رقم جوال صحيح')
      return
    }
    setLoading(true)
    try {
      // Normalize to E.164 for Saudi numbers
      const normalized = cleaned.startsWith('+')
        ? cleaned
        : cleaned.startsWith('05')
          ? `+966${cleaned.slice(1)}`
          : `+966${cleaned}`

      const result = await createBnplSession({
        provider,
        amount,
        customerPhone: normalized,
        customerName,
        customerId,
        cart,
      })
      setSessionId(result.sessionId)
      setInvoiceNumber(result.invoiceNumber)
      setStatus('PAYMENT_LINK_SENT')
      setElapsed(0)
      setStep('waiting')
    } catch (err: any) {
      // Check for structured BNPL decline errors
      if (err.message?.startsWith('BNPL_DECLINED:')) {
        const code = err.message.replace('BNPL_DECLINED:', '').trim()
        setDeclineCode(code)
        setStep('declined')
      } else {
        toast.error(`Failed to send payment link: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (sessionId) {
      await cancelBnplSession(sessionId).catch(() => {})
    }
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

        {/* ── Header ── */}
        <div
          className={cn('p-5 text-white relative bg-gradient-to-br', cfg.gradientCard)}
        >
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              {cfg.logo}
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">BNPL via</p>
              <h2 className="text-xl font-black leading-tight">{cfg.name} · {cfg.nameAr}</h2>
              <p className="text-[10px] opacity-60 mt-0.5">{cfg.taglineAr}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold opacity-80">Invoice Total</span>
            <span className="text-2xl font-black tabular-nums">
              {amount.toFixed(2)}{' '}
              <span className="text-sm opacity-60">SAR</span>
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5">

          {/* STEP 1: Phone Number Input */}
          {step === 'phone' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* SMS notice */}
              <div className={cn('flex items-start gap-2.5 rounded-2xl border p-3', cfg.lightBg)}>
                <MessageSquare size={15} className={cn('shrink-0 mt-0.5', cfg.textColor)} />
                <div>
                  <p className={cn('text-xs font-bold', cfg.textColor)}>{cfg.smsCopyAr}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{cfg.smsCopy}</p>
                </div>
              </div>

              {/* Phone field */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Customer Mobile · رقم جوال العميل
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-400">+966</span>
                  </div>
                  <input
                    type="tel"
                    className="w-full pl-16 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none font-bold text-gray-900 text-lg tracking-widest placeholder:text-gray-300 placeholder:font-normal placeholder:text-base"
                    placeholder="5xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                    autoFocus
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Cart mini-summary */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Items</p>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[180px]">{item.name}</span>
                      <span className="text-xs font-black text-gray-800 shrink-0 ml-2 tabular-nums">
                        ×{item.quantity} · {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateSession}
                disabled={loading || !phone.trim()}
                className={cn(
                  'w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg',
                  'bg-gradient-to-r', cfg.gradientCard,
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sending SMS...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Payment SMS · أرسل رابط الدفع</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Waiting for customer payment */}
          {step === 'waiting' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* SMS sent confirmation */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-700">SMS Sent Successfully!</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Payment link sent to <span className="font-mono font-bold">{phone}</span>
                  </p>
                </div>
              </div>

              {/* Waiting animation */}
              <div className="flex flex-col items-center gap-4 py-5">
                <div className="relative w-24 h-24">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-300 animate-spin" />
                  {/* Inner icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Smartphone size={30} className="text-blue-500" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-base font-black text-gray-800">Waiting for payment</p>
                  <p className="text-sm text-gray-500 mt-0.5">في انتظار دفع العميل</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-blue-500">
                    <WaitingDots />
                  </div>
                </div>
              </div>

              {/* Customer instruction */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 space-y-1.5 text-center">
                <p className="text-xs font-bold text-blue-700">
                  Customer should check their SMS and complete payment via {cfg.name}
                </p>
                <p className="text-[10px] text-blue-500">
                  يجب على العميل فتح رسالة SMS وإتمام الدفع عبر {cfg.nameAr}
                </p>
              </div>

              {/* Timer + invoice ref */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  Elapsed: {formatElapsed(elapsed)}
                </span>
                <span className="font-mono">Ref: {invoiceNumber}</span>
              </div>

              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="w-full py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel & Choose Different Payment · إلغاء
              </button>
            </div>
          )}

          {/* STEP 3: Done (PAID / FAILED / EXPIRED) */}
          {step === 'done' && (
            <div className="space-y-4 animate-in fade-in duration-300 py-2">
              {status === 'PAID' ? (
                <>
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in-95 duration-500">
                      <CheckCircle2 size={44} className="text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-emerald-700">Payment Confirmed!</p>
                      <p className="text-sm text-gray-400 mt-1">تم تأكيد الدفع بنجاح</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-emerald-700">
                      Invoice #{invoiceNumber} finalized. Stock updated.
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      تم إنشاء الفاتورة وتحديث المخزون
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                      {status === 'EXPIRED' ? (
                        <Clock size={44} className="text-amber-500" />
                      ) : (
                        <XCircle size={44} className="text-red-500" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-red-700">
                        {status === 'EXPIRED' ? 'Session Expired' : status === 'CANCELLED' ? 'Cancelled' : 'Payment Failed'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {status === 'EXPIRED' ? 'انتهت مدة الجلسة' : 'لم يتم الدفع'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs text-amber-800 font-medium">
                          No invoice was created. No inventory was deducted.
                        </p>
                        <p className="text-xs text-amber-700 font-medium" dir="rtl">
                          لم يتم إنشاء فاتورة أو خصم أي مخزون.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-gray-700 to-gray-900 text-sm transition-colors"
                  >
                    Choose Different Payment · طريقة دفع أخرى
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 4: Declined by provider */}
          {step === 'declined' && (() => {
            const msg = getBnplDeclineMessage(declineCode, provider)
            return (
              <div className="space-y-4 animate-in fade-in duration-300 py-1">
                {/* Icon + title */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
                    <XCircle size={42} className="text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-red-700">Application Declined</p>
                    <p className="text-sm font-bold text-red-500 mt-0.5">تم رفض الطلب</p>
                  </div>
                </div>

                {/* Reason card */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-red-800">{msg.en}</p>
                      <p className="text-sm font-bold text-red-700" dir="rtl">{msg.ar}</p>
                    </div>
                  </div>
                </div>

                {/* Tip card */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 space-y-1">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">What to do · ماذا تفعل</p>
                  <p className="text-xs text-amber-800 font-medium">{msg.tip}</p>
                  <p className="text-xs text-amber-700 font-medium" dir="rtl">{msg.tipAr}</p>
                </div>

                {/* No invoice notice */}
                <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                  <p className="text-[10px] text-gray-500 font-medium">
                    No invoice created · No stock deducted · لم يتم إنشاء فاتورة أو خصم مخزون
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('phone')}
                    className={cn(
                      'flex-1 py-3 rounded-2xl font-black text-white text-sm transition-all active:scale-[0.98]',
                      'bg-gradient-to-r', cfg.gradientCard
                    )}
                  >
                    Try Again · حاول مجدداً
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Other Payment · طريقة أخرى
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
