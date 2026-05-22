'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  ShoppingBag, 
  CreditCard, 
  UserMinus, 
  DollarSign, 
  Wifi,
  ChevronDown,
  AlertCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useLanguage } from '@/providers/language-provider'
import { useStore, Transaction, TransType, PayMethod } from '@/store/useStore'
import { addTransaction } from '@/actions/transactions'
import { getStaffList } from '@/actions/staff'
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

  const open = externalOpen !== undefined ? externalOpen : storeOpen
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setStoreOpen

  const [type, setType] = useState<TransType>('SALE')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayMethod>('CASH')
  const [description, setDescription] = useState('')
  const [staffId, setStaffId] = useState<number | null>(null)
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    getStaffList().then((data) => setStaffList(data))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'ADVANCE' && !staffId) {
      toast.warning('Staff Required', { description: 'Please select a staff member for the advance payment.' })
      return
    }
    setLoading(true)
    try {
      const result = await addTransaction({
        type,
        amount: parseFloat(amount),
        method,
        description,
        staffId: (type === 'ADVANCE' || type === 'EXPENSE') ? (staffId ?? undefined) : undefined
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
      setStaffId(null)
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
  ]

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setAmount('')
          setDescription('')
          setType('SALE')
          setMethod('CASH')
          setStaffId(null)
        }
      }}>
        {!hideTrigger && triggerClassName !== 'hidden' && (
          <DialogTrigger render={<Button className={cn("flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 px-6 font-bold h-11", triggerClassName)} />}>
            {children || (
              <>
                <Plus size={18} />
                {t('addTransaction')}
              </>
            )}
          </DialogTrigger>
        )}

        <DialogContent className={cn(
          "w-full max-w-none p-0 border-none shadow-3xl bg-white dark:bg-gray-950 flex flex-col overflow-hidden font-sans",
          "fixed inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 rounded-t-[1.75rem] rounded-b-none",
          "h-[100dvh] max-h-[100dvh]",
          "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:max-w-[95vw] sm:rounded-[2rem] lg:max-w-4xl lg:rounded-[3rem] sm:h-[85vh] sm:max-h-[90vh]"
        )}>
          
          {/* Header */}
          <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 dark:border-gray-900 flex justify-between items-center gap-3 shrink-0 safe-area-top">
            <div className="space-y-0.5 min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <div className={cn(
                  "p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shrink-0 transition-all duration-300",
                  type === 'SALE' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                  type === 'EXPENSE' && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                  type === 'ADVANCE' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                )}>
                  {(() => {
                    const Icon = typeOptions.find(o => o.id === type)?.icon || ShoppingBag
                    return <Icon size={20} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
                  })()}
                </div>
                <div className="min-w-0">
                  <span className="block truncate">{t('addTransaction')}</span>
                  <DialogDescription className="text-[11px] sm:text-xs font-semibold text-gray-400 mt-0.5 line-clamp-2">
                    {type === 'SALE' && "Record a cash or network sale transaction"}
                    {type === 'EXPENSE' && "Record a business or staff expense payout"}
                    {type === 'ADVANCE' && "Record a salary advance paid to staff"}
                  </DialogDescription>
                </div>
              </DialogTitle>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Mobile: amount first, then settings — Desktop: side-by-side */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden min-h-0 flex flex-col md:flex-row bg-gray-50/50 dark:bg-gray-900/30">
              
              {/* Amount & context — shown first on mobile */}
              <div className="order-1 md:order-2 flex-1 min-w-0 p-4 sm:p-6 md:p-8 md:overflow-y-auto flex flex-col bg-white dark:bg-gray-950 border-b md:border-b-0 border-gray-100 dark:border-gray-900">
                <div className="w-full max-w-md mx-auto space-y-5 sm:space-y-8 flex flex-col py-2 sm:py-8">
                  
                  <div className="w-full bg-gray-900 dark:bg-black rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 text-center shadow-2xl relative overflow-hidden border border-gray-800 dark:border-gray-900">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0,transparent_70%)] pointer-events-none" />
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[8px] sm:text-[9px] font-black tracking-widest text-gray-600 dark:text-gray-700 select-none hidden sm:block">
                      LED REGISTER
                    </div>
                    
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-2">
                      {t('amount')}
                    </span>
                    
                    <div className="relative flex items-baseline justify-center gap-1">
                      <span className="text-lg sm:text-2xl font-black text-blue-500 shrink-0 select-none">SAR</span>
                      <input
                        id="amount"
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full min-w-0 max-w-[12rem] sm:max-w-none text-center text-4xl sm:text-6xl lg:text-7xl font-black bg-transparent border-none text-white focus:ring-0 placeholder:text-gray-800 tabular-nums tracking-tighter outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {(type === 'ADVANCE' || type === 'EXPENSE') ? (
                    <div className="space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                        {t('selectStaff')}
                      </Label>
                      <Select 
                        value={staffId ? staffId.toString() : (type === 'EXPENSE' ? 'business' : '')} 
                        onValueChange={(val) => {
                          if (val === 'business' || val === '' || val === null) {
                            setStaffId(null)
                          } else {
                            const id = parseInt(val)
                            setStaffId(id)
                            if (type === 'ADVANCE') {
                              const staff = staffList.find(s => s.id === id)
                              if (staff) {
                                setDescription(`Advance for ${staff.name}`)
                              }
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full h-12 sm:h-14 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-850 rounded-2xl font-bold px-4 sm:px-5 focus:border-blue-500 transition-all flex items-center justify-between">
                          <span className="flex-1 text-left truncate text-sm">
                            {staffId 
                              ? (staffList.find(s => s.id === staffId)?.name || t('selectStaff'))
                              : (type === 'EXPENSE' ? t('business') : t('selectStaff'))}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl z-[150] max-h-[50vh]">
                          {type === 'EXPENSE' && (
                            <SelectItem value="business" className="font-bold py-3">{t('business')}</SelectItem>
                          )}
                          {staffList.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()} className="font-medium py-3">{staff.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="hidden md:flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-3xl text-gray-300 dark:text-gray-800 pointer-events-none select-none min-h-[110px]">
                      <AlertCircle size={24} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-black uppercase tracking-wider">System Fully Ready</span>
                      <span className="text-[9px] text-gray-400 dark:text-gray-600 mt-0.5">No additional configurations required</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings panel */}
              <div className="order-2 md:order-1 w-full md:w-[380px] lg:w-[420px] shrink-0 md:shrink-0 p-4 sm:p-6 md:p-8 md:border-r border-gray-100 dark:border-gray-900 md:overflow-y-auto bg-white dark:bg-gray-950">
                <div className="space-y-5 sm:space-y-6 max-w-md md:max-w-none mx-auto md:mx-0">
                  
                  {/* Transaction Type Cards */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                      Transaction Type
                    </Label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {typeOptions.map((opt) => {
                        const isSelected = type === opt.id
                        const Icon = opt.icon
                        
                        // Distinctive color classes
                        let colorClasses = ""
                        if (isSelected) {
                          if (opt.id === 'SALE') colorClasses = "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                          else if (opt.id === 'EXPENSE') colorClasses = "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                          else if (opt.id === 'ADVANCE') colorClasses = "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        } else {
                          colorClasses = "border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setType(opt.id as TransType)
                              if (opt.id !== 'ADVANCE' && opt.id !== 'EXPENSE') {
                                setStaffId(null)
                              }
                              // Auto-populate description if switching to ADVANCE and staff is already selected
                              if (opt.id === 'ADVANCE' && staffId) {
                                const staff = staffList.find(s => s.id === staffId)
                                if (staff) {
                                  setDescription(`Advance for ${staff.name}`)
                                }
                              }
                            }}
                            className={cn(
                              "flex flex-col items-center sm:items-start p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-center sm:text-left transition-all duration-300 active:scale-95 min-w-0",
                              colorClasses
                            )}
                          >
                            <div className={cn(
                              "p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-colors mb-1.5 sm:mb-3",
                              isSelected 
                                ? (opt.id === 'SALE' && "bg-blue-500 text-white") ||
                                  (opt.id === 'EXPENSE' && "bg-red-500 text-white") ||
                                  (opt.id === 'ADVANCE' && "bg-amber-500 text-white")
                                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                            )}>
                              <Icon size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
                            </div>
                            <span className="text-[9px] sm:text-xs font-black tracking-wide uppercase leading-tight line-clamp-2">{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
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
                            "flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 active:scale-95",
                            method === m.id 
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600" 
                              : "border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
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

                  {/* Notes / Description */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                      {t('description')}
                    </Label>
                    <textarea
                      placeholder={t('noDescription') || "Add internal notes..."}
                      value={description === ' ' ? '' : description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full p-4 text-sm font-medium rounded-2xl border-2 border-gray-100 dark:border-gray-850 bg-gray-50/30 focus:outline-none focus:border-blue-500 transition resize-none dark:bg-gray-900/10"
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* Footer Actions — sticky on mobile */}
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-900 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center bg-white dark:bg-gray-950 gap-3 sm:gap-4 shrink-0 safe-area-bottom">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  // reset
                  setAmount('')
                  setDescription('')
                  setType('SALE')
                  setMethod('CASH')
                  setStaffId(null)
                }}
                className="h-12 sm:h-14 px-6 sm:px-8 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white font-black text-sm flex items-center justify-center gap-2 transition w-full sm:w-auto"
              >
                <ArrowLeft size={16} />
                {t('cancel')}
              </button>

              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="h-12 sm:h-14 px-8 sm:px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 w-full sm:w-auto"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('confirmTransaction') || 'Confirm Transaction'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

        </DialogContent>
      </Dialog>
    </>
  )
}
