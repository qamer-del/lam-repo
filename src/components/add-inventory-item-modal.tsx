'use client'

import { useState } from 'react'
import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/providers/language-provider'
import { createInventoryItem, updateInventoryItem } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'
import { InventoryCategory } from '@prisma/client'

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'POLISH', label: 'Polish' },
  { value: 'COATING', label: 'Coating' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'CHEMICAL', label: 'Chemical' },
  { value: 'OTHER', label: 'Other' },
]

const UNITS = ['pcs', 'L', 'mL', 'kg', 'g', 'roll', 'box', 'set', 'pair']

interface EditItem {
  id: number
  name: string
  sku?: string | null
  category: InventoryCategory
  unit: string
  reorderLevel: number
  unitCost: number
}

interface Props {
  triggerClassName?: string
  editItem?: EditItem
  onClose?: () => void
}

export function AddInventoryItemModal({ triggerClassName, editItem, onClose }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(!!editItem)
  const [loading, setLoading] = useState(false)

  const isEdit = !!editItem

  const [name, setName] = useState(editItem?.name ?? '')
  const [sku, setSku] = useState(editItem?.sku ?? '')
  const [category, setCategory] = useState<InventoryCategory>(editItem?.category ?? 'OTHER')
  const [unit, setUnit] = useState(editItem?.unit ?? 'pcs')
  const [reorderLevel, setReorderLevel] = useState(String(editItem?.reorderLevel ?? 5))
  const [unitCost, setUnitCost] = useState(String(editItem?.unitCost ?? 0))
  const [initialStock, setInitialStock] = useState('0')

  const handleClose = (v: boolean) => {
    setOpen(v)
    if (!v) onClose?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        await updateInventoryItem(editItem.id, {
          name,
          sku: sku || undefined,
          category,
          unit,
          reorderLevel: parseFloat(reorderLevel) || 5,
          unitCost: parseFloat(unitCost) || 0,
        })
      } else {
        await createInventoryItem({
          name,
          sku: sku || undefined,
          category,
          unit,
          reorderLevel: parseFloat(reorderLevel) || 5,
          unitCost: parseFloat(unitCost) || 0,
          initialStock: parseFloat(initialStock) || 0,
        })
      }
      handleClose(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const trigger = !isEdit ? (
    <DialogTrigger
      render={
        <Button
          className={cn(
            'flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20 transition-all active:scale-95',
            triggerClassName
          )}
        />
      }
    >
      <Plus size={16} />
      {t('addItem')}
    </DialogTrigger>
  ) : null

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={handleClose}>
        {trigger}
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-teal-500 to-emerald-600" />
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Package size={22} />
                </div>
                {isEdit ? t('editItem') : t('addItem')}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('itemName')}</Label>
                <Input
                  required
                  placeholder="e.g. Meguiar's G17 Polish"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium"
                />
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('sku')}</Label>
                <Input
                  placeholder="e.g. POL-001 (optional)"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium"
                />
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('category')}</Label>
                  <Select value={category} onValueChange={(v: string | null) => { if (v) setCategory(v as InventoryCategory) }}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="font-medium py-2.5">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('unit')}</Label>
                  <Select value={unit} onValueChange={(v: string | null) => { if (v) setUnit(v) }}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="font-medium py-2.5">
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Unit Cost + Reorder Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('unitCost')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('reorderLevel')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    placeholder="5"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              </div>

              {/* Initial Stock — only on create */}
              {!isEdit && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('initialStock')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-bold"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-13 text-base font-black uppercase tracking-widest text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-2xl shadow-xl shadow-teal-500/20 active:scale-[0.98] transition-all mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('processing')}
                  </div>
                ) : t('submit')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
