'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
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
import { useLanguage } from '@/providers/language-provider'
import { recordDailySales } from '@/actions/transactions'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

export function AddSalesModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [total, setTotal] = useState('')
  const [cash, setCash] = useState('')
  const [network, setNetwork] = useState('')
  const [description, setDescription] = useState('')

  // Automatically calculate network when total or cash changes
  useEffect(() => {
    const tNum = parseFloat(total) || 0
    const cNum = parseFloat(cash) || 0
    if (tNum >= cNum) {
      setNetwork((tNum - cNum).toFixed(2))
    }
  }, [total, cash])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const tNum = parseFloat(total) || 0
    const cNum = parseFloat(cash) || 0
    const nNum = parseFloat(network) || 0

    if (Math.abs(tNum - (cNum + nNum)) > 0.01) {
      alert("Cash and Network amounts do not equal the Total Sales.")
      setLoading(false)
      return
    }

    try {
      await recordDailySales({
        totalAmount: tNum,
        cashAmount: cNum,
        networkAmount: nNum,
        description
      })
      
      setOpen(false)
      setTotal('')
      setCash('')
      setNetwork('')
      setDescription('')
      
      // Force refresh data
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className={cn("flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white", triggerClassName)} />}>
        <Plus size={16} />
        {t('addSales')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('addSales')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="total">{t('totalSales')}</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="text-lg font-bold border-emerald-300 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="grid gap-2">
              <Label htmlFor="cash">{t('cashPortion')}</Label>
              <Input
                id="cash"
                type="number"
                step="0.01"
                required
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="network">{t('networkPortion')}</Label>
              <Input
                id="network"
                type="number"
                disabled
                value={network}
                className="bg-gray-100 dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="grid gap-2 mt-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="mt-4 text-white bg-emerald-600 hover:bg-emerald-700">
            {t('submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
