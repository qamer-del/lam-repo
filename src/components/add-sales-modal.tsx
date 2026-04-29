'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Receipt, Banknote, Wifi, SplitSquareHorizontal,
  ShoppingBag, Trash2, ChevronDown, ChevronUp, Package, Check, ChevronsUpDown
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
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

type PayMode = 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA'

interface InventoryItem {
  id: number; name: string; sku: string | null; unit: string; currentStock: number; sellingPrice: number
}

interface ConsumedItem {
  itemId: number; quantity: string; price: string
}

const PAY_METHODS: { mode: PayMode; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { mode: 'CASH',    label: 'Cash',    icon: Banknote,             color: 'text-emerald-700', bg: 'bg-emerald-500',  border: 'border-emerald-500' },
  { mode: 'NETWORK', label: 'Network', icon: Wifi,                 color: 'text-blue-700',    bg: 'bg-blue-500',     border: 'border-blue-500' },
  { mode: 'SPLIT',   label: 'Split',   icon: SplitSquareHorizontal, color: 'text-orange-700',  bg: 'bg-orange-500',   border: 'border-orange-500' },
  { mode: 'TABBY',   label: 'Tabby',   icon: ShoppingBag,          color: 'text-purple-700',  bg: 'bg-purple-500',   border: 'border-purple-500' },
  { mode: 'TAMARA',  label: 'Tamara',  icon: ShoppingBag,          color: 'text-pink-700',    bg: 'bg-pink-500',     border: 'border-pink-500' },
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
  const [consumedItems, setConsumedItems] = useState<ConsumedItem[]>([{ itemId: 0, quantity: '1', price: '' }])
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([])
  const [comboboxOpen, setComboboxOpen] = useState<{ [key: number]: boolean }>({})

  // Auto-calc network from total - cash in split mode
  useEffect(() => {
    if (payMode !== 'SPLIT') return
    const t = parseFloat(total) || 0
    const c = parseFloat(cashAmt) || 0
    if (t >= c) setNetAmt((t - c).toFixed(2))
  }, [total, cashAmt, payMode])

  // Load inventory once per open
  useEffect(() => {
    if (open && inventoryList.length === 0) {
      getAllInventoryItemsForSelect().then(setInventoryList)
    }
  }, [open])

  const reset = () => {
    setPayMode('CASH'); setTotal(''); setCashAmt(''); setNetAmt('')
    setDescription(''); setConsumedItems([{ itemId: 0, quantity: '1', price: '' }])
  }

  const validate = (): string | null => {
    const validItems = consumedItems.filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0)
    if (validItems.length === 0) return 'You must select at least one item for the sales invoice.'

    const t = parseFloat(total) || 0
    if (t <= 0) return 'Please enter a valid total amount.'
    if (payMode === 'SPLIT') {
      const c = parseFloat(cashAmt) || 0
      const n = parseFloat(netAmt) || 0
      if (Math.abs(t - (c + n)) > 0.01) return 'Cash + Network must equal the total.'
      if (c <= 0 && n <= 0) return 'Enter at least one split amount.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { alert(err); return }
    setLoading(true)
    try {
      await recordDailySales({
        paymentMode: payMode,
        totalAmount: parseFloat(total),
        cashAmount: payMode === 'SPLIT' ? (parseFloat(cashAmt) || 0) : undefined,
        networkAmount: payMode === 'SPLIT' ? (parseFloat(netAmt) || 0) : undefined,
        description: description || undefined,
        consumedItems: consumedItems
          .filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0)
          .map(ci => ({ itemId: ci.itemId, quantity: parseFloat(ci.quantity) })),
      })
      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('An error occurred. Please try again.')
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

        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-950">
          {/* Status bar based on payment method */}
          <div className={cn('h-2 w-full transition-all duration-700', selectedMethod.bg)} />

          <div className="p-8 md:p-10 space-y-8">
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
                <div className="grid grid-cols-5 gap-2">
                  {PAY_METHODS.map(({ mode, label, icon: Icon, color, border }) => {
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
                          {label}
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
                        <Label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-1">Total Amount</Label>
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
                            <Banknote size={14} /> Cash Part
                          </Label>
                          <Input
                            type="number" step="0.01" min="0" placeholder="0.00"
                            value={cashAmt} onChange={e => setCashAmt(e.target.value)}
                            className="h-12 rounded-xl border-transparent bg-white dark:bg-gray-950 focus:border-emerald-500 font-black text-xl tabular-nums"
                          />
                        </div>
                        <div className="space-y-2 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                            <Wifi size={14} /> Network Part
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
                              <CommandInput placeholder="Search items..." className="h-12" />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty>No item found.</CommandEmpty>
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
                                          {item.currentStock} {item.unit} available • {item.sellingPrice} SAR
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
                            type="number" step="0.1" min="0" placeholder="Qty"
                            value={ci.quantity}
                            onChange={e => updateConsumedItem(index, 'quantity', e.target.value)}
                            className="h-12 rounded-2xl border-none bg-gray-50 dark:bg-gray-950 shadow-inner font-black text-center"
                          />
                        </div>
                        <div className="flex-1 sm:w-28">
                          <Input
                            type="number" step="0.01" min="0" placeholder="Price"
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
                    <span>Record {selectedMethod.label} Sale</span>
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
