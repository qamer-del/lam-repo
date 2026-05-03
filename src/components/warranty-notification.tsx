'use client'

import { useState } from 'react'
import { ShieldCheck, Copy, Check, X, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface WarrantyItem {
  id: number
  invoiceNumber: string
  warrantyEndDate: string | Date
  item: {
    name: string
    warrantyDuration: number | null
    warrantyUnit: string | null
  }
}

interface WarrantyNotificationProps {
  warranties: WarrantyItem[]
  customerPhone?: string
  onDismiss: () => void
}

export function WarrantyNotification({ warranties, customerPhone, onDismiss }: WarrantyNotificationProps) {
  const [copied, setCopied] = useState(false)

  if (!warranties || warranties.length === 0) return null

  const invoiceNumber = warranties[0].invoiceNumber

  // Build WhatsApp message
  const lines = [
    `Thank you for your purchase! 🛡️`,
    ``,
    ...warranties.map(w => [
      `📦 Product: ${w.item.name}`,
      `✅ Warranty: Replacement for ${w.item.warrantyDuration} ${w.item.warrantyUnit}`,
      `📅 Expiry: ${format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}`,
    ].join('\n')),
    ``,
    `🧾 Invoice #: ${invoiceNumber}`,
    ``,
    `To verify your warranty anytime, visit:`,
    `${typeof window !== 'undefined' ? window.location.origin : ''}/warranty/check?invoice=${invoiceNumber}`,
  ]

  const message = lines.join('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const whatsappUrl = customerPhone
    ? `https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
    : null

  return (
    <div className="fixed bottom-6 right-6 z-[200] w-[340px] animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl shadow-black/20 border border-violet-200 dark:border-violet-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Warranty Issued!</p>
              <p className="text-violet-200 text-[10px] font-bold uppercase tracking-widest">
                {warranties.length} item{warranties.length > 1 ? 's' : ''} covered
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warranty list */}
        <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
          {warranties.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-2xl">
              <ShieldCheck size={16} className="text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-xs text-gray-900 dark:text-white truncate">{w.item.name}</p>
                <p className="text-[10px] text-gray-500 font-medium">
                  Replacement · {w.item.warrantyDuration} {w.item.warrantyUnit} · until{' '}
                  <span className="font-bold text-violet-600">{format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message preview */}
        <div className="mx-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">WhatsApp Message Preview</p>
          <pre className="text-[10px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans line-clamp-4">
            {message}
          </pre>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleCopy}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-10 rounded-2xl text-xs font-black uppercase tracking-wide transition-all',
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Message</>}
          </button>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-2xl text-xs font-black uppercase tracking-wide bg-[#25D366] hover:bg-[#1da851] text-white transition-all"
            >
              <MessageCircle size={14} />
              Send WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
