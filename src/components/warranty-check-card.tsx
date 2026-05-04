'use client'

import { ShieldCheck, ShieldOff, ShieldAlert, Calendar, Package, User, Phone, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/providers/language-provider'

type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED'

interface WarrantyCheckResult {
  id: number
  invoiceNumber: string
  saleDate: string | Date
  warrantyEndDate: string | Date
  status: WarrantyStatus
  claimedAt?: string | Date | null
  claimNotes?: string | null
  customerName?: string | null
  customerPhone?: string | null
  item: {
    name: string
    sku?: string | null
    warrantyDuration?: number | null
    warrantyUnit?: string | null
  }
  customer?: {
    name: string
    phone?: string | null
  } | null
}

const STATUS_CONFIG: (t: any) => Record<WarrantyStatus, {
  label: string
  icon: any
  bg: string
  border: string
  badge: string
  badgeText: string
  glow: string
}> = (t) => ({
  ACTIVE: {
    label: t('active'),
    icon: ShieldCheck,
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-500',
    badgeText: 'text-white',
    glow: 'shadow-emerald-500/20',
  },
  EXPIRED: {
    label: t('expired'),
    icon: ShieldOff,
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-500',
    badgeText: 'text-white',
    glow: 'shadow-red-500/10',
  },
  CLAIMED: {
    label: t('claimed'),
    icon: ShieldAlert,
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-500',
    badgeText: 'text-white',
    glow: 'shadow-amber-500/10',
  },
})

interface WarrantyCheckCardProps {
  warranty: WarrantyCheckResult
  showClaimButton?: boolean
  onClaim?: (warrantyId: number) => void
}

export function WarrantyCheckCard({ warranty, showClaimButton, onClaim }: WarrantyCheckCardProps) {
  const { t } = useLanguage()
  const cfg = STATUS_CONFIG(t)[warranty.status]
  const StatusIcon = cfg.icon
  const endDate = new Date(warranty.warrantyEndDate)
  const saleDate = new Date(warranty.saleDate)
  const displayName = warranty.customer?.name || warranty.customerName
  const displayPhone = warranty.customer?.phone || warranty.customerPhone

  return (
    <div className={cn(
      'rounded-[2rem] border-2 p-6 space-y-5 shadow-xl transition-all',
      cfg.bg, cfg.border, cfg.glow
    )}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-2xl shadow-inner', cfg.badge + '/10')}>
            <StatusIcon size={26} className={cn(
              warranty.status === 'ACTIVE' ? 'text-emerald-600' :
              warranty.status === 'EXPIRED' ? 'text-red-500' : 'text-amber-600'
            )} strokeWidth={2} />
          </div>
           <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('warrantyStatus')}</p>
            <p className={cn('text-2xl font-black',
              warranty.status === 'ACTIVE' ? 'text-emerald-700 dark:text-emerald-400' :
              warranty.status === 'EXPIRED' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
            )}>
              {cfg.label}
            </p>
          </div>
        </div>
        <span className={cn('px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest', cfg.badge, cfg.badgeText)}>
          {t('replacement')}
        </span>
      </div>

      {/* Item Info */}
      <div className="p-4 bg-white/70 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
        <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <Package size={20} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 dark:text-white leading-tight truncate">{warranty.item.name}</p>
          {warranty.item.sku && (
            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{warranty.item.sku}</p>
          )}
          {warranty.item.warrantyDuration && (
            <p className="text-xs font-bold text-gray-500 mt-0.5">
              {warranty.item.warrantyDuration} {warranty.item.warrantyUnit} {t('replacementWarranty')}
            </p>
          )}
        </div>
      </div>

      {/* Dates grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white/70 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={12} className="text-gray-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('purchaseDate')}</p>
          </div>
          <p className="font-black text-gray-900 dark:text-white text-sm">{format(saleDate, 'dd MMM yyyy')}</p>
        </div>
        <div className={cn('p-4 rounded-2xl border',
          warranty.status === 'ACTIVE'
            ? 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800'
            : 'bg-white/70 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={12} className={warranty.status === 'ACTIVE' ? 'text-emerald-500' : 'text-gray-400'} />
            <p className={cn('text-[10px] font-black uppercase tracking-widest',
              warranty.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'
            )}>{t('validUntil')}</p>
          </div>
          <p className={cn('font-black text-sm',
            warranty.status === 'ACTIVE' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500'
          )}>
            {format(endDate, 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      {/* Invoice + Customer */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
          <Receipt size={14} className="text-gray-400 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('invoice')}</span>
          <span className="font-mono text-xs font-black text-gray-700 dark:text-gray-300 ml-auto">{warranty.invoiceNumber}</span>
        </div>
        {displayName && (
          <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
            <User size={14} className="text-gray-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customer')}</span>
            <span className="text-xs font-black text-gray-700 dark:text-gray-300 ml-auto">{displayName}</span>
          </div>
        )}
        {displayPhone && (
          <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
            <Phone size={14} className="text-gray-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('phone')}</span>
            <span className="text-xs font-black text-gray-700 dark:text-gray-300 ml-auto">{displayPhone}</span>
          </div>
        )}
      </div>

      {/* Claim info */}
      {warranty.status === 'CLAIMED' && warranty.claimedAt && (
        <div className="p-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">{t('claimedOn')}</p>
          <p className="text-sm font-black text-amber-700 dark:text-amber-400">{format(new Date(warranty.claimedAt), 'dd MMM yyyy, HH:mm')}</p>
          {warranty.claimNotes && (
            <p className="text-xs text-amber-600/70 mt-1 italic">"{warranty.claimNotes}"</p>
          )}
        </div>
      )}

      {/* Claim Button */}
      {showClaimButton && warranty.status === 'ACTIVE' && onClaim && (
        <button
          onClick={() => onClaim(warranty.id)}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ShieldCheck size={16} />
          {t('processReplacementClaim')}
        </button>
      )}
    </div>
  )
}
