'use client'

import { useState } from 'react'
import { Undo2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/providers/language-provider'
import { recordRefund } from '@/actions/transactions'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

export function AddRefundModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'CASH' | 'NETWORK'>('CASH')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await recordRefund({
        amount: parseFloat(amount),
        method,
        description
      })
      
      setOpen(false)
      setAmount('')
      setMethod('CASH')
      setDescription('')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to record refund')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" className={cn("flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50", triggerClassName)} />}>
          <Undo2 size={16} />
          Refund
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Undo2 size={18} />
              Process Sales Return / Refund
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold border-red-300 focus-visible:ring-red-500"
              />
            </div>

            <div className="grid gap-2">
              <Label>Refund Method</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger className="border-red-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash Refund (Deducts from Drawer)</SelectItem>
                  <SelectItem value="NETWORK">Network Refund (Deducts from Network Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="refund-description">{t('description')}</Label>
              <Input
                id="refund-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason for return..."
              />
            </div>

            <Button type="submit" disabled={loading} className="mt-4 text-white bg-red-600 hover:bg-red-700 font-bold py-6">
              Confirm Refund
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
