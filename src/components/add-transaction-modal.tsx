'use client'

import { useState } from 'react'
import { 
  Plus, 
  ShoppingBag, 
  CreditCard, 
  UserMinus, 
  Wallet, 
  DollarSign, 
  Wifi,
  ChevronDown,
  AlertCircle
} from 'lucide-react'
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
import { toast } from 'sonner'

export function AddTransactionModal({ 
  triggerClassName, 
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  hideTrigger
}: { 
  triggerClassName?: string, 
  children?: React.ReactNode,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  hideTrigger?: boolean
}) {
  const { t } = useLanguage()
  const { addTransaction: addTxToStore, isAddTxOpen: storeOpen, setIsAddTxOpen: setStoreOpen } = useStore()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const open = externalOpen !== undefined ? externalOpen : storeOpen
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setStoreOpen

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
    if (type === 'ADVANCE' && !staffId) {
      toast.warning('Staff Required', { description: 'Please select a staff member for the advance payment.' })
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
      toast.success('Transaction Recorded', {
        description: `Successfully recorded a ${type.toLowerCase()} of ${amount} SAR via ${method.toLowerCase()}.`,
      })
      setOpen(false)
      // reset
      setAmount('')
      setDescription('')
      setType('SALE')
      setMethod('CASH')
      setStaffId(undefined)
    } catch (error) {
      console.error(error)
      toast.error('Transaction Failed', {
        description: 'An error occurred while saving the transaction. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const typeOptions = [
    { id: 'SALE', label: t('sale'), icon: ShoppingBag, color: 'blue' },
    { id: 'EXPENSE', label: t('expense'), icon: CreditCard, color: 'red' },
    { id: 'ADVANCE', label: t('advance'), icon: UserMinus, color: 'amber' },
    { id: 'OWNER_WITHDRAWAL', label: t('ownerWithdrawal'), icon: Wallet, color: 'purple' },
  ]

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={setOpen}>
      {triggerClassName !== 'hidden' && (
        <DialogTrigger render={<Button className={cn("flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 px-6 font-bold h-11", triggerClassName)} />}>
          {children || (
            <>
              <Plus size={18} />
              {t('addTransaction')}
            </>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-3xl rounded-[2.5rem] bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-3xl">
        <div className="p-6 sm:p-8 space-y-8">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t('addTransaction')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* iOS Segmented Control for Transaction Type */}
            <div className="bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-2xl flex relative h-12">
              {typeOptions.slice(0, 3).map((opt) => {
                const isSelected = type === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setType(opt.id as TransType)
                      if (opt.id !== 'ADVANCE') setStaffId(undefined)
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all duration-300 z-10",
                      isSelected 
                        ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" 
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Centered Amount Input */}
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {t('amount')}
              </span>
              <div className="relative flex items-baseline justify-center">
                <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 mr-2">SAR</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-center text-7xl font-black bg-transparent border-none focus:ring-0 placeholder:text-gray-200 dark:placeholder:text-gray-800 tabular-nums tracking-tighter outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Staff Selection (Conditional) */}
              {(type === 'ADVANCE' || type === 'EXPENSE') && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                    {t('selectStaff')}
                  </Label>
                  <Select 
                    value={staffId ? staffId.toString() : (type === 'EXPENSE' ? 'business' : '')} 
                    onValueChange={(val: any) => {
                      if (val === 'business') setStaffId(undefined)
                      else if (val) setStaffId(parseInt(val))
                    }}
                  >
                    <SelectTrigger className="h-14 bg-white/50 dark:bg-gray-900/50 border-none rounded-2xl font-bold px-5">
                      <SelectValue placeholder={t('selectStaff')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {type === 'EXPENSE' && (
                        <SelectItem value="business" className="font-bold py-3">{t('business')}</SelectItem>
                      )}
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id.toString()} className="font-medium py-3">{staff.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Payment Method Selector (iOS Grid) */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                  {t('method')}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'CASH', label: t('cash'), icon: DollarSign },
                    { id: 'NETWORK', label: t('network'), icon: Wifi }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as PayMethod)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300",
                        method === m.id 
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600" 
                          : "border-transparent bg-white/50 dark:bg-gray-900/50 text-gray-400 hover:bg-white dark:hover:bg-gray-900"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        method === m.id ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <m.icon size={16} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Notes */}
              <div className="space-y-3">
                <div 
                  className="flex items-center justify-between px-1 cursor-pointer group"
                  onClick={() => setDescription(prev => prev === '' ? ' ' : prev)}
                >
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t('description')}
                  </Label>
                  <ChevronDown size={14} className={cn("text-gray-300 transition-transform", description !== '' && "rotate-180")} />
                </div>
                {description !== '' && (
                  <Input
                    id="description"
                    placeholder={t('noDescription') || "Add internal notes..."}
                    value={description === ' ' ? '' : description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-14 rounded-2xl border-none bg-white/50 dark:bg-gray-900/50 px-5 font-medium animate-in fade-in slide-in-from-top-1 duration-200"
                  />
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-16 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-2xl shadow-blue-500/30 active:scale-[0.98] transition-all mt-4"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('processing')}
                </div>
              ) : t('confirmTransaction') || 'Confirm Transaction'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
