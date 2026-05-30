'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Package } from 'lucide-react'
import { createConsumptionRequest } from '@/actions/inventory-consumption'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'

const PREDEFINED_REASONS_KEYS = [
  'reasonStaffUsage',
  'reasonCleaning',
  'reasonInternalOps',
  'reasonMaintenance',
  'reasonDamagedReplacement',
] as const

export function CreateConsumptionModal({
  open,
  onOpenChange,
  inventoryItems,
  staffMembers
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItems: any[]
  staffMembers: any[]
}) {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(false)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [staffId, setStaffId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [reasonKey, setReasonKey] = useState<typeof PREDEFINED_REASONS_KEYS[number]>('reasonStaffUsage')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setItemId('')
      setQuantity('1')
      setStaffId('')
      setEmployeeName('')
      setReasonKey('reasonStaffUsage')
      setNotes('')
    }
  }, [open])

  const selectedItem = inventoryItems.find(i => i.id === parseInt(itemId))

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
      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || t('operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-lg bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 p-0 overflow-hidden rounded-3xl shadow-2xl',
          isRTL && 'rtl'
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-black tracking-tight text-gray-900 dark:text-white">
                {t('internalConsumption')}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">{t('internalConsumptionSubtitle')}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('item')}</label>
            <select
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
            >
              <option value="" disabled>{t('selectConsumptionItem')}</option>
              {inventoryItems.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.currentStock} {i.unit}
                </option>
              ))}
            </select>
            {selectedItem && (
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold px-1">
                ✓ {t('unitCost')}: {selectedItem.unitCost?.toLocaleString()} SAR
              </p>
            )}
          </div>

          {/* Quantity & Reason */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('quantity')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
              {selectedItem && quantity && !isNaN(parseFloat(quantity)) && (
                <p className="text-[10px] text-gray-400 font-semibold px-1">
                  ≈ {(parseFloat(quantity) * (selectedItem.unitCost || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('reasonLabel')}</label>
              <select
                value={reasonKey}
                onChange={e => setReasonKey(e.target.value as any)}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              >
                {PREDEFINED_REASONS_KEYS.map(rk => (
                  <option key={rk} value={rk}>{t(rk)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Staff / Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('staffOrName')}</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={staffId}
                onChange={e => { setStaffId(e.target.value); setEmployeeName('') }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              >
                <option value="">{t('selectStaff')}</option>
                {staffMembers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                type="text"
                placeholder={t('orTypeName')}
                value={employeeName}
                onChange={e => { setEmployeeName(e.target.value); setStaffId('') }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('notesOptional')}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              placeholder="..."
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {t('submitRequest')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
