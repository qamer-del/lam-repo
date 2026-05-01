'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Trash2, DollarSign, Wifi, Package, ChevronsUpDown, Check, Users } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { useLanguage } from '@/providers/language-provider'
import { createPurchaseOrder, getAllInventoryItemsForSelect } from '@/actions/inventory'
import { getAgents } from '@/actions/agents'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'
import { toast } from 'sonner'
import { useStore, Transaction } from '@/store/useStore'

interface InventoryItem {
  id: number
  name: string
  unit: string
  currentStock: number
}

interface Agent {
  id: number
  name: string
  companyName?: string | null
}

interface LineItem {
  itemId: number
  quantity: string
  unitCost: string
}

export function AddPurchaseModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [agentId, setAgentId] = useState<string>('none')
  const [method, setMethod] = useState<'CASH' | 'NETWORK' | 'CREDIT'>('CASH')
  const [note, setNote] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ itemId: 0, quantity: '', unitCost: '' }])
  const [comboboxOpen, setComboboxOpen] = useState<{ [key: number]: boolean }>({})

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    if (open) {
      getAllInventoryItemsForSelect().then(setInventoryItems)
      getAgents().then(setAgents)
    }
  }, [open])

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { itemId: 0, quantity: '', unitCost: '' }])
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const totalCost = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const cost = parseFloat(item.unitCost) || 0
    return sum + qty * cost
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = lineItems.filter(
      (i) => i.itemId > 0 && parseFloat(i.quantity) > 0
    )
    if (validItems.length === 0) {
      toast.warning('Invalid Items', { description: 'Please add at least one item with a valid quantity.' })
      return
    }
    if (method === 'CREDIT' && agentId === 'none') {
      toast.warning('Supplier Required', { description: 'Please select a supplier for credit purchases.' })
      return
    }
    setLoading(true)
    try {
      const result = await createPurchaseOrder({
        agentId: agentId !== 'none' ? parseInt(agentId) : undefined,
        method,
        note: note || undefined,
        items: validItems.map((i) => ({
          itemId: i.itemId,
          quantity: parseFloat(i.quantity),
          unitCost: parseFloat(i.unitCost) || 0,
        })),
      })
      
      if (result) {
        useStore.getState().addTransaction(result as Transaction)
      }

      setOpen(false)
      toast.success('Purchase Recorded', {
        description: `Successfully recorded a ${method.toLowerCase()} purchase of ${totalCost.toFixed(2)} SAR.`,
      })
      setLineItems([{ itemId: 0, quantity: '', unitCost: '' }])
      setAgentId('none')
      setNote('')
    } catch (err) {
      console.error(err)
      toast.error('Purchase Failed', {
        description: 'An error occurred while recording the purchase order.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              className={cn(
                'flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95',
                triggerClassName
              )}
            />
          }
        >
          <ShoppingCart size={16} />
          {t('addPurchase')}
        </DialogTrigger>

        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto font-cairo">
          <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 sticky top-0 z-10" />
          <div className="p-5 sm:p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShoppingCart size={22} />
                </div>
                {t('addPurchase')}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier (optional) */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('supplier')}</Label>
                <Select value={agentId} onValueChange={(v: string | null) => { if (v) setAgentId(v) }}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium">
                    <SelectValue placeholder={t('noSupplier')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="none" className="font-medium py-2.5 text-gray-400 italic">
                      {t('noSupplier')}
                    </SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)} className="font-medium py-2.5">
                        {a.name}{a.companyName ? ` — ${a.companyName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('method')}</Label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl h-12">
                  <button
                    type="button"
                    onClick={() => setMethod('CASH')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm',
                      method === 'CASH'
                        ? 'bg-white dark:bg-gray-900 text-emerald-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    )}
                  >
                    <DollarSign size={15} />
                    {t('cash') || 'Cash'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('NETWORK')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm',
                      method === 'NETWORK'
                        ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    )}
                  >
                    <Wifi size={15} />
                    {t('network') || 'Network'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('CREDIT')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm',
                      method === 'CREDIT'
                        ? 'bg-white dark:bg-gray-900 text-amber-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    )}
                  >
                    <Users size={15} />
                    {t('credit') || 'Credit'}
                  </button>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('purchaseItems')}</Label>
                </div>

                <div className="space-y-3">
                  {lineItems.map((line, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                        <div className="w-full sm:flex-1">
                          <Popover open={!!comboboxOpen[index]} onOpenChange={(v) => setComboboxOpen(p => ({ ...p, [index]: v }))}>
                            <PopoverTrigger render={
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between h-10 rounded-xl border-gray-200 dark:border-gray-700 font-medium text-sm bg-white dark:bg-gray-900 px-3 py-2 shadow-sm",
                                  !line.itemId && "text-gray-400"
                                )}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Package size={16} className="text-blue-500 shrink-0" />
                                  <span className="truncate">
                                    {line.itemId
                                      ? inventoryItems.find((item) => item.id === line.itemId)?.name
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
                                    {inventoryItems.map((item) => (
                                      <CommandItem
                                        key={item.id}
                                        value={`${item.name} ${item.unit || ''}`}
                                        onSelect={() => {
                                          updateLineItem(index, 'itemId', item.id)
                                          setComboboxOpen(p => ({ ...p, [index]: false }))
                                        }}
                                        className="py-3 px-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950"
                                      >
                                        <Check className={cn("mr-2 h-4 w-4 text-blue-600", line.itemId === item.id ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="font-bold">{item.name}</span>
                                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-tight">
                                            {item.currentStock} {item.unit} available
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

                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('quantity')}</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0"
                            value={line.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            className="h-9 rounded-xl text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('unitCost')}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.unitCost}
                            onChange={(e) => updateLineItem(index, 'unitCost', e.target.value)}
                            className="h-9 rounded-xl text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold"
                          />
                        </div>
                      </div>

                      {line.itemId > 0 && parseFloat(line.quantity) > 0 && (
                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 text-right">
                          Subtotal: {(parseFloat(line.quantity) * (parseFloat(line.unitCost) || 0)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addLineItem}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-teal-600 dark:text-teal-400 border-2 border-dashed border-teal-200 dark:border-teal-800 rounded-xl hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition"
                >
                  <Plus size={16} />
                  {t('addLineItem')}
                </button>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-gray-400">{t('description')}</Label>
                <Input
                  placeholder="Optional note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 font-medium"
                />
              </div>

              {/* Total */}
              {totalCost > 0 && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <span className="text-sm font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">{t('totalCost')}</span>
                  <span className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-300">{totalCost.toFixed(2)}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-13 text-base font-black uppercase tracking-widest text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('processing')}
                  </div>
                ) : t('received')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
