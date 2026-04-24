'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useStore, Transaction, TransType, PayMethod } from '@/store/useStore'
import { addTransaction } from '@/actions/transactions'
import { getStaffList } from '@/actions/staff'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ModernLoader } from './ui/modern-loader'

export function AddTransactionModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const { addTransaction: addTxToStore } = useStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [type, setType] = useState<TransType>('SALE')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayMethod>('CASH')
  const [description, setDescription] = useState('')
  const [staffId, setStaffId] = useState<number | undefined>(undefined)
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    getStaffList().then((data) => setStaffList(data))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((type === 'ADVANCE' || type === 'EXPENSE') && !staffId) {
      alert('Please select a staff member')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await addTransaction({
        type,
        amount: parseFloat(amount),
        method,
        description,
        staffId: (type === 'ADVANCE' || type === 'EXPENSE') ? staffId : undefined
      })
      
      addTxToStore(result as Transaction)
      setOpen(false)
      // reset
      setAmount('')
      setDescription('')
      setType('SALE')
      setMethod('CASH')
      setStaffId(undefined)
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
      <DialogTrigger render={<Button className={cn("flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95", triggerClassName)} />}>
        <Plus size={16} />
        {t('addTransaction')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('addTransaction')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">{t('type')}</Label>
            <Select value={type} onValueChange={(val: any) => {
              if (val) setType(val)
              if (val !== 'ADVANCE') setStaffId(undefined)
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALE">{t('sale')}</SelectItem>
                <SelectItem value="EXPENSE">{t('expense')}</SelectItem>
                <SelectItem value="ADVANCE">{t('advance')}</SelectItem>
                <SelectItem value="OWNER_WITHDRAWAL">{t('ownerWithdrawal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(type === 'ADVANCE' || type === 'EXPENSE') && (
            <div className="grid gap-2">
              <Label htmlFor="staffId">{t('selectStaff')}</Label>
              <Select value={staffId ? staffId.toString() : ''} onValueChange={(val: any) => val && setStaffId(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStaff')} />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="amount">{t('amount')}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="method">{t('method')}</Label>
            <Select value={method} onValueChange={(val: any) => val && setMethod(val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('method')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">{t('cash')}</SelectItem>
                <SelectItem value="NETWORK">{t('network')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="mt-2 text-white bg-blue-600 hover:bg-blue-700">
            {t('submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
