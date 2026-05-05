'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Receipt, Banknote, Wifi, SplitSquareHorizontal,
  ShoppingBag, Trash2, Package, Check, ChevronsUpDown, Users, UserPlus, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { useLanguage } from '@/providers/language-provider'
import { recordDailySales } from '@/actions/transactions'
import { getAllInventoryItemsForSelect } from '@/actions/inventory'
import { getAllCustomersForSelect, createCustomer } from '@/actions/customers'
import { useRouter } from 'next/navigation'
import { en } from '@/lib/translations'
import { ModernLoader } from './ui/modern-loader'
import { WarrantyNotification } from './warranty-notification'
import { toast } from 'sonner'
import { useStore, Transaction } from '@/store/useStore'

type PayMode = 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA' | 'CREDIT'

interface InventoryItem {
  id: number; name: string; sku: string | null; unit: string; currentStock: number; sellingPrice: number
  hasWarranty?: boolean; warrantyDuration?: number | null; warrantyUnit?: string | null
}

interface CustomerOption {
  id: number; name: string; phone: string | null
}

interface ConsumedItem {
  itemId: number; quantity: string; price: string
}

const PAY_METHODS: { mode: PayMode; labelKey: keyof typeof en; icon: any; color: string; bg: string; border: string }[] = [
  { mode: 'CASH',    labelKey: 'cash',    icon: Banknote,             color: 'text-emerald-700', bg: 'bg-emerald-500',  border: 'border-emerald-500' },
  { mode: 'NETWORK', labelKey: 'network', icon: Wifi,                 color: 'text-blue-700',    bg: 'bg-blue-500',     border: 'border-blue-500' },
  { mode: 'SPLIT',   labelKey: 'splitPayment',   icon: SplitSquareHorizontal, color: 'text-orange-700',  bg: 'bg-orange-500',   border: 'border-orange-500' },
  { mode: 'TABBY',   labelKey: 'tabby',   icon: ShoppingBag,          color: 'text-purple-700',  bg: 'bg-purple-500',   border: 'border-purple-500' },
  { mode: 'TAMARA',  labelKey: 'tamara',  icon: ShoppingBag,          color: 'text-pink-700',    bg: 'bg-pink-500',     border: 'border-pink-500' },
  { mode: 'CREDIT',  labelKey: 'credit',  icon: Users,                color: 'text-amber-700',   bg: 'bg-amber-500',    border: 'border-amber-500' },
]

export function AddSalesModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [payMode, setPayMode] = useState<PayMode>('CASH')
  const [total, setTotal] = useState('')
  const [cashAmt, setCashAmt] = useState('')
  const [netAmt, setNetAmt] = useState('')
  const [description, setDescription] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerList, setCustomerList] = useState<CustomerOption[]>([])
  const [customerComboOpen, setCustomerComboOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddPhone, setQuickAddPhone] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)
  const [consumedItems, setConsumedItems] = useState<ConsumedItem[]>([{ itemId: 0, quantity: '1', price: '' }])
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([])
  const [comboboxOpen, setComboboxOpen] = useState<{ [key: number]: boolean }>({})
  const [pendingWarranties, setPendingWarranties] = useState<any[]>([])

  // Auto-calc network from total - cash in split mode
  useEffect(() => {
    if (payMode !== 'SPLIT') return
    const t = parseFloat(total) || 0
    const c = parseFloat(cashAmt) || 0
    if (t >= c) setNetAmt((t - c).toFixed(2))
  }, [total, cashAmt, payMode])

  // Load inventory + customers once per open
  useEffect(() => {
    if (open) {
      if (inventoryList.length === 0) getAllInventoryItemsForSelect().then(setInventoryList)
      if (customerList.length === 0) getAllCustomersForSelect().then(setCustomerList)
    }
  }, [open])

  const reset = () => {
    setPayMode('CASH'); setTotal(''); setCashAmt(''); setNetAmt('')
    setDescription(''); setCustomerId(null); setCustomerName(''); setCustomerPhone('')
    setCustomerSearch(''); setQuickAddMode(false); setQuickAddPhone('')
    setConsumedItems([{ itemId: 0, quantity: '1', price: '' }])
    // Note: don't clear pendingWarranties here — let user dismiss the notification
  }

  const validate = (): string | null => {
    const validItems = consumedItems.filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0)
    if (validItems.length === 0) return t('selectAtLeastOneItem')

    const tAmt = parseFloat(total) || 0
    if (tAmt <= 0) return t('enterValidTotal')
    if (payMode === 'SPLIT') {
      const c = parseFloat(cashAmt) || 0
      const n = parseFloat(netAmt) || 0
      if (Math.abs(tAmt - (c + n)) > 0.01) return t('splitAmountError')
      if (c <= 0 && n <= 0) return t('enterOneSplitAmount')
    }
    if (payMode === 'CREDIT') {
      if (!customerId && (!customerName.trim() || !customerPhone.trim())) return t('creditCustomerRequired')
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { 
      toast.warning(t('validationError'), { description: err })
      return 
    }
    setLoading(true)
    try {
      const results = await recordDailySales({
        paymentMode: payMode,
        totalAmount: parseFloat(total),
        cashAmount: payMode === 'SPLIT' ? (parseFloat(cashAmt) || 0) : undefined,
        networkAmount: payMode === 'SPLIT' ? (parseFloat(netAmt) || 0) : undefined,
        description: description || undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        consumedItems: consumedItems
          .filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0)
          .map(ci => ({ itemId: ci.itemId, quantity: parseFloat(ci.quantity) })),
      })
      
      if (results) {
        useStore.getState().addTransactions(results as Transaction[])

        // Check if any sold items have warranty — fetch created warranty records
        const soldItemIds = consumedItems.filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0).map(ci => ci.itemId)
        const warrantyItems = inventoryList.filter(item => soldItemIds.includes(item.id) && item.hasWarranty)
        if (warrantyItems.length > 0 && results.length > 0) {
          // Fetch created warranty records for the notification
          const { checkWarrantyStatus } = await import('@/actions/warranty')
          const invNum = results[0].invoiceNumber
          if (invNum) {
            const warrantyRecords = await checkWarrantyStatus({ invoiceNumber: invNum })
            if (warrantyRecords.length > 0) {
              setPendingWarranties(warrantyRecords)
            }
          }
        }
      }

      toast.success('Transaction Successful', {
        description: `Successfully recorded a ${payMode.toLowerCase()} sale of ${total} SAR.`,
      })
      reset()
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Transaction Failed', {
        description: 'An error occurred while recording the sale. Please check your connection.',
      })
    } finally {
      setLoading(false)
    }
  }

  const addConsumedItem = () => setConsumedItems(p => [...p, { itemId: 0, quantity: '1', price: '' }])
  const removeConsumedItem = (i: number) => setConsumedItems(p => p.filter((_, idx) => idx !== i))
  const updateConsumedItem = (i: number, field: keyof ConsumedItem, val: string | number) => {
    setConsumedItems(p => {
      const newItems = p.map((ci, idx) => idx === i ? { ...ci, [field]: val } : ci)
      const newTotal = newItems.reduce((acc, curr) => {
        return acc + (parseFloat(curr.quantity || '0') * parseFloat(curr.price || '0'))
      }, 0)
      if (newTotal > 0) setTotal(newTotal.toFixed(2))
      return newItems
    })
  }

  const selectedMethod = PAY_METHODS.find(m => m.mode === payMode)!

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
        <DialogTrigger render={
          <Button className={cn(
            'flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95',
            triggerClassName
          )} />
        }>
          <Plus size={16} />
          {t('addSales')}
        </DialogTrigger>

        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-950 font-cairo">
          {/* Status bar based on payment method */}
          <div className={cn('h-2 w-full transition-all duration-700 sticky top-0 z-10', selectedMethod.bg)} />

          <div className="p-6 md:p-10 space-y-8">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                  <div className={cn('p-3 rounded-2xl shadow-inner', `bg-${payMode === 'CASH' ? 'emerald' : payMode === 'NETWORK' ? 'blue' : payMode === 'SPLIT' ? 'orange' : payMode === 'TABBY' ? 'purple' : 'pink'}-500/10 dark:bg-opacity-20`)}>
                    <Receipt size={28} className={selectedMethod.color} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="leading-tight">{t('addSales')}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Transaction Entry</span>
                  </div>
                </DialogTitle>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ── Payment Method Picker ── */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('paymentMethod')}</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PAY_METHODS.map(({ mode, labelKey, icon: Icon, color, border }) => {
                    const active = payMode === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPayMode(mode)}
                        className={cn(
                          'group flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300',
                          active
                            ? `${border} bg-white dark:bg-gray-900 shadow-xl scale-[1.05] z-10`
                            : 'border-transparent bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <Icon size={20} className={active ? color : 'text-gray-400 group-hover:text-gray-600 transition-colors'} />
                        <span className={cn('text-[9px] font-black uppercase tracking-tight', active ? color : 'text-gray-400 group-hover:text-gray-600')}>
                          {t(labelKey)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Main Amount Section ── */}
              <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 shadow-inner">
                <div className="relative z-10">
                  {payMode === 'SPLIT' ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-1">{t('totalAmount')}</Label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400 font-black text-xl">SAR</span>
                          <Input
                            type="number" step="0.01" min="0" required placeholder="0.00"
                            value={total} onChange={e => setTotal(e.target.value)}
                            className="h-20 text-4xl pl-16 font-black rounded-3xl border-transparent bg-white dark:bg-gray-950 focus:border-orange-500 shadow-sm transition-all tabular-nums text-orange-600"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                            <Banknote size={14} /> {t('cashPortion')}
                          </Label>
                          <Input
                            type="number" step="0.01" min="0" placeholder="0.00"
                            value={cashAmt} onChange={e => setCashAmt(e.target.value)}
                            className="h-12 rounded-xl border-transparent bg-white dark:bg-gray-950 focus:border-emerald-500 font-black text-xl tabular-nums"
                          />
                        </div>
                        <div className="space-y-2 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                            <Wifi size={14} /> {t('networkPortion')}
                          </Label>
                          <Input
                            readOnly value={netAmt}
                            className="h-12 rounded-xl border-transparent bg-blue-50/50 dark:bg-blue-900/20 font-black text-xl tabular-nums text-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className={cn('text-[10px] font-black uppercase tracking-widest ml-1', selectedMethod.color)}>
                        {t('totalSales')}
                      </Label>
                      <div className="relative">
                        <span className={cn('absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl opacity-40', selectedMethod.color)}>SAR</span>
                        <Input
                          type="number" step="0.01" min="0" required placeholder="0.00"
                          value={total} onChange={e => setTotal(e.target.value)}
                          className={cn(
                            'h-20 text-4xl pl-16 font-black rounded-3xl border-transparent bg-white dark:bg-gray-950 shadow-sm transition-all tabular-nums',
                            payMode === 'CASH'    ? 'focus:border-emerald-500 text-emerald-600' :
                            payMode === 'NETWORK' ? 'focus:border-blue-500 text-blue-600' :
                            payMode === 'TABBY'   ? 'focus:border-purple-500 text-purple-600' :
                                                   'focus:border-pink-500 text-pink-600'
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Customer Picker (optional for all, required for CREDIT) ── */}
              <div className={`space-y-3 p-5 rounded-[2rem] border transition-all duration-300 ${
                payMode === 'CREDIT'
                  ? 'bg-amber-500/5 border-amber-200/50 dark:border-amber-800/30'
                  : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800'
              }`}>
                <Label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                  payMode === 'CREDIT' ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {t('selectCustomer')} {payMode === 'CREDIT' ? '*' : `(${t('walkinCustomer')})`}
                </Label>

                <Popover open={customerComboOpen} onOpenChange={(v) => { setCustomerComboOpen(v); if (!v) { setQuickAddMode(false); setQuickAddPhone('') } }}>
                  <PopoverTrigger render={
                    <button className={`flex w-full items-center justify-between h-12 rounded-2xl border-none px-4 py-2 text-sm font-bold shadow-inner transition-colors ${
                      customerId ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' : 'bg-white dark:bg-gray-950 text-gray-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Users size={16} className={customerId ? 'text-amber-500' : 'text-gray-300'} />
                        <span>{customerId ? customerList.find(c => c.id === customerId)?.name || customerName || t('selectCustomer') : t('selectCustomer')}</span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    </button>
                  } />

                  <PopoverContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-none overflow-hidden">
                    {quickAddMode ? (
                      /* ── Quick-add mini-form ── */
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            type="button"
                            onClick={() => { setQuickAddMode(false); setQuickAddPhone('') }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <span className="text-xs font-black uppercase tracking-widest text-violet-600 flex items-center gap-1.5">
                            <UserPlus size={13} /> {t('newCustomer')}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customerName')}</Label>
                          <Input
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            placeholder={t('fullName')}
                            className="h-10 rounded-xl font-bold"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customerPhone')}</Label>
                          <Input
                            value={quickAddPhone}
                            onChange={e => setQuickAddPhone(e.target.value)}
                            placeholder={t('placeholderPhone')}
                            className="h-10 rounded-xl font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!customerSearch.trim() || quickAddSaving}
                          onClick={async () => {
                            if (!customerSearch.trim()) return
                            setQuickAddSaving(true)
                            try {
                              const newCust = await createCustomer({ name: customerSearch.trim(), phone: quickAddPhone.trim() || undefined })
                              const newOpt: CustomerOption = { id: newCust.id, name: newCust.name, phone: newCust.phone }
                              setCustomerList(prev => [...prev, newOpt].sort((a, b) => a.name.localeCompare(b.name)))
                              setCustomerId(newCust.id)
                              setCustomerName(newCust.name)
                              setCustomerPhone(newCust.phone || '')
                              setCustomerComboOpen(false)
                              setQuickAddMode(false)
                              setQuickAddPhone('')
                              toast.success(`${t('customerAdded')}: '${newCust.name}'`)
                            } catch {
                              toast.error(t('failedToAddCustomer'))
                            } finally {
                              setQuickAddSaving(false)
                            }
                          }}
                          className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
                        >
                          {quickAddSaving ? '...' : <><UserPlus size={13} /> Save & Select</>}
                        </button>
                      </div>
                    ) : (
                      /* ── Search list ── */
                      <Command>
                        <CommandInput
                          placeholder={t('searchCustomer')}
                          className="h-12"
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
                        <CommandList className="max-h-[240px]">
                          <CommandGroup>
                            {customerId !== null && (
                              <CommandItem
                                value="__clear__"
                                onSelect={() => { setCustomerId(null); setCustomerName(''); setCustomerPhone(''); setCustomerComboOpen(false) }}
                                className="py-2 px-4 cursor-pointer text-gray-400 italic text-xs"
                              >
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                {t('walkinCustomer')}
                              </CommandItem>
                            )}
                            {customerList.map(c => (
                              <CommandItem
                                key={c.id}
                                value={`${c.name} ${c.phone || ''}`}
                                onSelect={() => {
                                  setCustomerId(c.id)
                                  setCustomerName(c.name)
                                  setCustomerPhone(c.phone || '')
                                  setCustomerSearch('')
                                  setCustomerComboOpen(false)
                                }}
                                className="py-3 px-4 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950"
                              >
                                <Check className={cn('mr-2 h-4 w-4 text-amber-600', customerId === c.id ? 'opacity-100' : 'opacity-0')} />
                                <div className="flex flex-col">
                                  <span className="font-bold">{c.name}</span>
                                  {c.phone && <span className="text-[10px] text-gray-400">{c.phone}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          {/* ── Quick-add trigger ── */}
                          {customerSearch.trim().length > 0 && (
                            <CommandGroup>
                              <CommandItem
                                value={`__add__${customerSearch}`}
                                onSelect={() => setQuickAddMode(true)}
                                className="py-3 px-4 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 font-bold"
                              >
                                <UserPlus size={14} className="mr-2 shrink-0" />
                                Add &ldquo;{customerSearch}&rdquo; as new customer
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Freetext fallback — shown when CREDIT and no registered customer selected */}
                {payMode === 'CREDIT' && !customerId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-amber-500 ml-1">{t('customerName')}</Label>
                      <Input
                        placeholder="e.g. Ahmad Al-Harbi"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="h-11 rounded-xl border-amber-100 dark:border-amber-900 bg-white dark:bg-gray-950 focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-amber-500 ml-1">{t('customerPhone')}</Label>
                      <Input
                        placeholder="05xxxxxxxx"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="h-11 rounded-xl border-amber-100 dark:border-amber-900 bg-white dark:bg-gray-950 focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Items Selection ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inventory Items</Label>
                  <button
                    type="button" onClick={addConsumedItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                  >
                    <Plus size={12} strokeWidth={3} /> {t('addSales')}
                  </button>
                </div>

                <div className="space-y-3">
                  {consumedItems.map((ci, index) => (
                    <div key={index} className="group relative flex flex-col sm:flex-row items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md transition-all">
                      <div className="w-full sm:flex-1">
                        <Popover open={!!comboboxOpen[index]} onOpenChange={(v) => setComboboxOpen(p => ({ ...p, [index]: v }))}>
                          <PopoverTrigger render={
                            <button
                              className={cn(
                                "flex w-full items-center justify-between h-12 rounded-2xl border-none bg-gray-50 dark:bg-gray-950 px-4 py-2 text-sm font-bold shadow-inner transition-colors",
                                !ci.itemId && "text-gray-400"
                              )}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Package size={16} className="text-teal-500 shrink-0" />
                                <span className="truncate">
                                  {ci.itemId
                                    ? inventoryList.find((item) => item.id === ci.itemId)?.name
                                    : t('selectItem')}
                                </span>
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                            </button>
                          } />
                          <PopoverContent className="w-[320px] sm:w-[400px] p-0 rounded-2xl shadow-2xl border-none overflow-hidden">
                            <Command>
                              <CommandInput placeholder={t('searchItems')} className="h-12" />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty>{t('noItemFound')}</CommandEmpty>
                                <CommandGroup>
                                  {inventoryList.map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={`${item.name} ${item.sku || ''}`}
                                      onSelect={() => {
                                        updateConsumedItem(index, 'itemId', item.id)
                                        setTimeout(() => updateConsumedItem(index, 'price', item.sellingPrice.toString()), 0)
                                        setComboboxOpen(p => ({ ...p, [index]: false }))
                                      }}
                                      className="py-3 px-4 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950"
                                    >
                                      <Check className={cn("mr-2 h-4 w-4 text-teal-600", ci.itemId === item.id ? "opacity-100" : "opacity-0")} />
                                      <div className="flex flex-col">
                                        <span className="font-bold">{item.name}</span>
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-tight">
                                          {item.currentStock} {item.unit} {t('available')} • {item.sellingPrice} SAR
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex-1 sm:w-20">
                          <Input
                            type="number" step="0.1" min="0" placeholder={t('qty')}
                            value={ci.quantity}
                            onChange={e => updateConsumedItem(index, 'quantity', e.target.value)}
                            className="h-12 rounded-2xl border-none bg-gray-50 dark:bg-gray-950 shadow-inner font-black text-center"
                          />
                        </div>
                        <div className="flex-1 sm:w-28">
                          <Input
                            type="number" step="0.01" min="0" placeholder={t('price')}
                            value={ci.price}
                            onChange={e => updateConsumedItem(index, 'price', e.target.value)}
                            className="h-12 rounded-2xl border-none bg-teal-500/5 dark:bg-teal-500/10 shadow-inner font-black text-center text-teal-600"
                          />
                        </div>
                        <button
                          type="button" onClick={() => removeConsumedItem(index)}
                          className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Description ── */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('description')}</Label>
                <Input
                  placeholder="e.g. Full detail package — Toyota Camry"
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="h-14 rounded-2xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 focus:bg-white dark:focus:bg-gray-900 transition-all font-medium px-5"
                />
              </div>

              {/* ── Submit ── */}
              <Button
                type="submit" disabled={loading}
                className={cn(
                  'w-full h-18 text-lg font-black uppercase tracking-widest text-white rounded-3xl shadow-2xl active:scale-[0.98] transition-all duration-500 mt-6',
                  payMode === 'CASH'    ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-emerald-500/30' :
                  payMode === 'NETWORK' ? 'bg-gradient-to-r from-blue-500 to-blue-700 shadow-blue-500/30' :
                  payMode === 'SPLIT'   ? 'bg-gradient-to-r from-orange-500 to-orange-700 shadow-orange-500/30' :
                  payMode === 'TABBY'   ? 'bg-gradient-to-r from-purple-500 to-purple-700 shadow-purple-500/30' :
                  payMode === 'CREDIT'  ? 'bg-gradient-to-r from-amber-500 to-amber-700 shadow-amber-500/30' :
                                         'bg-gradient-to-r from-pink-500 to-pink-700 shadow-pink-500/30'
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('processing')}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Check className="w-6 h-6" />
                    <span>{t('recordSale')} {t(selectedMethod.labelKey)}</span>
                  </div>
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {pendingWarranties.length > 0 && (
        <WarrantyNotification
          warranties={pendingWarranties}
          customerPhone={customerPhone || undefined}
          onDismiss={() => setPendingWarranties([])}
        />
      )}
    </>
  )
}
