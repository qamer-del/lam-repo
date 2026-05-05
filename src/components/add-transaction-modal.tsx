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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto font-cairo">
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-indigo-700 sticky top-0 z-10" />
        <div className="p-5 sm:p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Plus size={24} />
              </div>
              {t('addTransaction')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type Grid */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('type')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {typeOptions.map((opt) => {
                  const Icon = opt.icon
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
                        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 gap-2 group relative overflow-hidden",
                        isSelected 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/20" 
                          : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all duration-300",
                        isSelected 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110" 
                          : "bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:scale-105"
                      )}>
                        <Icon size={18} strokeWidth={2.5} />
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest text-center transition-colors",
                        isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-400"
                      )}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Staff Selection */}
            <div className={cn(
              "transition-all duration-500 overflow-hidden",
              (type === 'ADVANCE' || type === 'EXPENSE') ? "max-h-40 opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"
            )}>
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Label htmlFor="staffId" className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <UserMinus size={14} />
                  {t('selectStaff')}
                </Label>
                <Select 
                  value={staffId ? staffId.toString() : (type === 'EXPENSE' ? 'business' : '')} 
                  onValueChange={(val: any) => {
                    if (val === 'business') setStaffId(undefined)
                    else if (val) setStaffId(parseInt(val))
                  }}
                >
                  <SelectTrigger className="h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl font-bold">
                    <SelectValue placeholder={t('selectStaff')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {type === 'EXPENSE' && (
                      <SelectItem value="business" className="font-bold py-3">{t('business')}</SelectItem>
                    )}
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()} className="font-medium py-3">{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {type === 'ADVANCE' && !staffId && (
                  <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold animate-pulse">
                    <AlertCircle size={12} />
                    REQUIRED FOR ADVANCES
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-xs font-black uppercase tracking-widest text-gray-400">{t('amount')}</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-blue-500 transition-colors">
                    <DollarSign size={20} />
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12 h-14 text-2xl font-black rounded-2xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
              </div>

              {/* Payment Method Toggle */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('method')}</Label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl h-14 border border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setMethod('CASH')}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest",
                      method === 'CASH' 
                        ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700" 
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    )}
                  >
                    <DollarSign size={14} strokeWidth={3} />
                    {t('cash')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('NETWORK')}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest",
                      method === 'NETWORK' 
                        ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700" 
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    )}
                  >
                    <Wifi size={14} strokeWidth={3} />
                    {t('network')}
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-gray-400">{t('description')}</Label>
              <Input
                id="description"
                placeholder={t('noDescription') || "Note details here..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 font-medium transition-all"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all mt-4"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('processing') || 'Processing...'}
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
