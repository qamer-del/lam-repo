'use client'

import { useState } from 'react'
import { Wallet, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { addTransaction } from '@/actions/transactions'
import { toast } from 'sonner'

interface AddAdvanceDialogProps {
  staffId: number
  staffName: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded?: () => void
}

export function AddAdvanceDialog({ staffId, staffName, open, onOpenChange, onAdded }: AddAdvanceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [method, setMethod] = useState<'CASH' | 'NETWORK'>('CASH')

  const reset = () => {
    setAmount('')
    setDescription('')
    setMethod('CASH')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    setLoading(true)
    try {
      await addTransaction({
        type: 'ADVANCE',
        amount: amt,
        method,
        description: description || `Advance for ${staffName}`,
        staffId,
      })
      toast.success('Advance Recorded', {
        description: `${amt.toFixed(2)} SAR advance recorded for ${staffName}.`,
      })
      reset()
      onOpenChange(false)
      onAdded?.()
    } catch (err: any) {
      toast.error('Failed', { description: err.message || 'Could not record advance.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 border-none bg-white dark:bg-gray-950 shadow-2xl">
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Wallet size={18} />
              </div>
              Add Advance
            </DialogTitle>
            <p className="text-sm text-gray-500 font-medium">{staffName}</p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="bg-gray-900 rounded-2xl p-5 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0,transparent_70%)] pointer-events-none" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-2">Amount</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xl font-black text-amber-500">SAR</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full max-w-[180px] text-center text-4xl font-black bg-transparent border-none text-white focus:ring-0 placeholder:text-gray-800 tabular-nums tracking-tighter outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['CASH', 'NETWORK'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMethod(m)}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-black uppercase transition-all ${
                      method === m
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:border-gray-300'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Description (optional)</Label>
              <textarea
                placeholder={`Advance for ${staffName}`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full p-3 text-sm font-medium rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-amber-400 transition resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}
                className="flex-1 text-gray-400 hover:text-gray-700">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !amount || parseFloat(amount) <= 0}
                className="flex-1 bg-amber-500 hover:bg-amber-600 font-bold text-white rounded-xl gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Record Advance
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
