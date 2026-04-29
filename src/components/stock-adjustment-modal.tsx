'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/providers/language-provider'
import { adjustStock } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

interface Props {
  item: {
    id: number
    name: string
    currentStock: number
    unit: string
  }
  onClose: () => void
}

export function StockAdjustmentModal({ item, onClose }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  const delta = parseFloat(quantity) || 0
  const newStock = item.currentStock + delta

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (delta === 0) {
      alert('Please enter a non-zero quantity.')
      return
    }
    setLoading(true)
    try {
      await adjustStock({ itemId: item.id, quantity: delta, note: note || undefined })
      onClose()
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                  <SlidersHorizontal size={20} />
                </div>
                {t('adjustStock')}
              </DialogTitle>
              <p className="text-sm text-gray-500 font-medium mt-1">
                {item.name} — Current: <span className="font-black text-gray-800 dark:text-gray-100">{item.currentStock} {item.unit}</span>
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Quantity Change (+ to add, − to remove)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 10 or -5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-13 text-2xl font-black rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-amber-500 transition"
                />
                {quantity && (
                  <p className={`text-sm font-bold ${newStock < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    New stock will be: <span className={`font-black ${newStock < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{newStock.toFixed(1)} {item.unit}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('adjustmentNote')}</Label>
                <Input
                  placeholder="e.g. Stock count correction"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || newStock < 0}
                className="w-full h-12 font-black uppercase tracking-widest text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('processing')}
                  </div>
                ) : t('adjustStock')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
