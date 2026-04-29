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

        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
          {/* Coloured accent top bar — changes with payment method */}
          <div className={cn('h-2 w-full transition-all duration-500', selectedMethod.bg)} />

          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className={cn('p-2 rounded-xl', `bg-${payMode === 'CASH' ? 'emerald' : payMode === 'NETWORK' ? 'blue' : payMode === 'SPLIT' ? 'orange' : payMode === 'TABBY' ? 'purple' : 'pink'}-100 dark:bg-opacity-20`)}>
                  <Receipt size={22} className={selectedMethod.color} />
                </div>
                {t('addSales')}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Payment Method Picker ── */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('paymentMethod')}</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PAY_METHODS.map(({ mode, label, icon: Icon, color, border }) => {
                    const active = payMode === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPayMode(mode)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all duration-200',
                          active
                            ? `${border} bg-white dark:bg-gray-900 shadow-lg scale-[1.04]`
                            : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <Icon size={18} className={active ? color : 'text-gray-400'} />
                        <span className={cn('text-[10px] font-black uppercase tracking-tight', active ? color : 'text-gray-400')}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Amount Fields ── */}
              {payMode === 'SPLIT' ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Total Amount</Label>
                    <Input
                      type="number" step="0.01" min="0" required placeholder="0.00"
                      value={total} onChange={e => setTotal(e.target.value)}
                      className="h-14 text-2xl font-black rounded-2xl border-2 border-orange-200 focus:border-orange-500 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Banknote size={12} className="text-emerald-500" /> Cash
                      </Label>
                      <Input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={cashAmt} onChange={e => setCashAmt(e.target.value)}
                        className="h-11 font-bold rounded-xl border-2 border-emerald-200 focus:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Wifi size={12} className="text-blue-500" /> Network
                      </Label>
                      <Input
                        readOnly value={netAmt} tabIndex={-1}
                        className="h-11 font-bold rounded-xl border-2 border-blue-100 bg-blue-50/60 dark:bg-blue-900/10 dark:border-blue-900 text-blue-700 dark:text-blue-400"
                      />
                    </div>
                  </div>
                  {parseFloat(total) > 0 && (
                    <div className="flex items-center justify-between text-sm px-1">
                      <span className="text-gray-400 font-medium">Balance check</span>
                      <span className={cn(
                        'font-black tabular-nums',
                        Math.abs(parseFloat(total) - ((parseFloat(cashAmt) || 0) + (parseFloat(netAmt) || 0))) < 0.01
                          ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {((parseFloat(cashAmt) || 0) + (parseFloat(netAmt) || 0)).toFixed(2)} / {parseFloat(total).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('totalSales')}</Label>
                  <Input
                    type="number" step="0.01" min="0" required placeholder="0.00"
                    value={total} onChange={e => setTotal(e.target.value)}
                    className={cn(
                      'h-14 text-2xl font-black rounded-2xl border-2 transition-colors',
                      payMode === 'CASH'    ? 'border-emerald-200 focus:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800' :
                      payMode === 'NETWORK' ? 'border-blue-200 focus:border-blue-500 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800' :
                      payMode === 'TABBY'   ? 'border-purple-200 focus:border-purple-500 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800' :
                                             'border-pink-200 focus:border-pink-500 bg-pink-50 dark:bg-pink-900/10 dark:border-pink-800'
                    )}
                  />
                </div>
              )}

              {/* ── Description ── */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('description')}</Label>
                <Input
                  placeholder="e.g. Full detail package — Toyota Camry"
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium"
                />
              </div>

              {/* ── Items Used (mandatory) ── */}
              <div className="rounded-2xl border border-teal-100 dark:border-teal-900 overflow-hidden shadow-sm">
                <div className="w-full flex items-center justify-between px-4 py-3 bg-teal-50/50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-900">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-teal-600" />
                    <span className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">Invoice Items <span className="text-red-500">*</span></span>
                    {consumedItems.filter(ci => ci.itemId > 0).length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                        {consumedItems.filter(ci => ci.itemId > 0).length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
                  {consumedItems.map((ci, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start gap-2">
                      <div className="w-full sm:flex-1">
                        <Popover open={!!comboboxOpen[index]} onOpenChange={(v) => setComboboxOpen(p => ({ ...p, [index]: v }))}>
                          <PopoverTrigger
                            className={cn(
                              "flex w-full items-center justify-between h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                              !ci.itemId && "text-muted-foreground"
                            )}
                          >
                            {ci.itemId
                              ? inventoryList.find((item) => item.id === ci.itemId)?.name
                              : t('selectItem')}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] sm:w-[400px] p-0 rounded-xl shadow-xl border-none">
                            <Command>
                              <CommandInput placeholder="Search by name or SKU..." />
                              <CommandList className="max-h-[250px]">
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
                                      className="py-2.5 font-medium cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 text-teal-600",
                                          ci.itemId === item.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{item.name} {item.sku && <span className="text-gray-400 text-xs ml-1">({item.sku})</span>}</span>
                                        <span className="text-xs text-gray-500">{item.currentStock} {item.unit} left • {item.sellingPrice} SAR</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto items-center">
                        <Input
                          type="number" step="0.1" min="0" placeholder="Qty"
                          value={ci.quantity}
                          onChange={e => updateConsumedItem(index, 'quantity', e.target.value)}
                          className="flex-1 sm:flex-none sm:w-20 h-11 rounded-xl text-sm font-bold border-gray-200 dark:border-gray-700 text-center"
                        />
                        <Input
                          type="number" step="0.01" min="0" placeholder="Price"
                          value={ci.price}
                          onChange={e => updateConsumedItem(index, 'price', e.target.value)}
                          className="flex-1 sm:flex-none sm:w-28 h-11 rounded-xl text-sm font-bold border-gray-200 dark:border-gray-700 text-center text-teal-600 dark:text-teal-400"
                        />
                        <button
                          type="button" onClick={() => removeConsumedItem(index)}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button" onClick={addConsumedItem}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-teal-600 dark:text-teal-400 border-2 border-dashed border-teal-200 dark:border-teal-800 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition mt-2"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>
                </div>
              </div>

              {/* ── Submit ── */}
              <Button
                type="submit" disabled={loading}
                className={cn(
                  'w-full h-13 text-base font-black uppercase tracking-widest text-white rounded-2xl shadow-xl active:scale-[0.98] transition-all',
                  payMode === 'CASH'    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/20' :
                  payMode === 'NETWORK' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20' :
                  payMode === 'SPLIT'   ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20' :
                  payMode === 'TABBY'   ? 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-purple-500/20' :
                                         'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-pink-500/20'
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('processing')}
                  </div>
                ) : `Record ${selectedMethod.label} Sale`}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
