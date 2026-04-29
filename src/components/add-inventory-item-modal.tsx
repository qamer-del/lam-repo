'use client'

import { useState } from 'react'
import { Plus, Package, Check } from 'lucide-react'
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
  costIncludesVat?: boolean
  sellingPrice?: number
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
  const [costIncludesVat, setCostIncludesVat] = useState(editItem?.costIncludesVat ?? false)
  const [sellingPrice, setSellingPrice] = useState(String(editItem?.sellingPrice ?? 0))
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
          costIncludesVat,
          sellingPrice: parseFloat(sellingPrice) || 0,
        })
      } else {
        await createInventoryItem({
          name,
          sku: sku || undefined,
          category,
          unit,
          reorderLevel: parseFloat(reorderLevel) || 5,
          unitCost: parseFloat(unitCost) || 0,
          costIncludesVat,
          sellingPrice: parseFloat(sellingPrice) || 0,
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
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white dark:bg-gray-950">
          <div className="h-2 w-full bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-600" />
          <div className="p-8 md:p-10 space-y-8">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                  <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl shadow-inner">
                    <Package size={28} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="leading-tight">{isEdit ? t('editItem') : t('addItem')}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{t('inventoryManagement')}</span>
                  </div>
                </DialogTitle>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Main Info Section */}
              <div className="grid gap-6 p-6 bg-gray-50/50 dark:bg-gray-900/30 rounded-[2rem] border border-gray-100 dark:border-gray-800/50 shadow-inner">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('itemName')}</Label>
                  <Input
                    required
                    placeholder="e.g. Meguiar's G17 Polish"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 rounded-2xl border-2 border-transparent bg-white dark:bg-gray-900 focus:border-teal-500 focus:ring-teal-500/10 shadow-sm text-lg font-bold transition-all px-5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('sku')}</Label>
                    <Input
                      placeholder="POL-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="h-12 rounded-xl border-2 border-transparent bg-white dark:bg-gray-900 focus:border-teal-500 font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('category')}</Label>
                    <Select value={category} onValueChange={(v: string | null) => { if (v) setCategory(v as InventoryCategory) }}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-transparent bg-white dark:bg-gray-900 focus:border-teal-500 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="rounded-lg py-3 font-bold">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-teal-50/30 dark:bg-teal-900/10 rounded-[1.5rem] border border-teal-100 dark:border-teal-900/30 space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 ml-1">{t('unitCost')}</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600 font-black text-sm">SAR</span>
                    <Input
                      type="number" step="0.01" min="0" required
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="h-12 pl-12 rounded-xl border-2 border-transparent bg-white dark:bg-gray-900 focus:border-teal-500 font-black text-xl tabular-nums"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 opacity-80 hover:opacity-100 transition-opacity">
                    <input 
                      type="checkbox"
                      checked={costIncludesVat}
                      onChange={(e) => setCostIncludesVat(e.target.checked)}
                      className="w-4 h-4 rounded border-teal-200 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-tight">Incl. VAT</span>
                  </label>
                </div>

                <div className="p-5 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-900/30 space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 ml-1">Selling Price</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-sm">SAR</span>
                    <Input
                      type="number" step="0.01" min="0" required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="h-12 pl-12 rounded-xl border-2 border-transparent bg-white dark:bg-gray-900 focus:border-emerald-500 font-black text-xl tabular-nums text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-2 gap-4 px-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('unit')}</Label>
                  <Select value={unit} onValueChange={(v: string | null) => { if (v) setUnit(v) }}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl p-1">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="rounded-lg py-2 font-medium">{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('reorderLevel')}</Label>
                  <Input
                    type="number" step="0.1" min="0" required
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 font-bold text-center"
                  />
                </div>
              </div>

              {!isEdit && (
                <div className="p-6 bg-blue-50/30 dark:bg-blue-900/10 rounded-[1.5rem] border border-blue-100 dark:border-blue-900/30 space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 ml-1">{t('initialStock')}</Label>
                  <Input
                    type="number" step="0.1" min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="h-12 rounded-xl border-2 border-transparent bg-white dark:bg-gray-900 focus:border-blue-500 font-black text-xl tabular-nums text-center"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-16 text-lg font-black uppercase tracking-widest text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-[1.25rem] shadow-2xl shadow-teal-500/20 active:scale-[0.98] transition-all mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('processing')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    {t('submit')}
                  </div>
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
