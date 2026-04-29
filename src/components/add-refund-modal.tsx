'use client'

import { useState, useEffect } from 'react'
import { Undo2, Package, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react'
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { useLanguage } from '@/providers/language-provider'
import { recordRefund, getInvoiceDetails } from '@/actions/transactions'
import { getAllInventoryItemsForSelect } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

interface InventoryItem {
  id: number; name: string; sku: string | null; unit: string; currentStock: number; sellingPrice: number
}

interface ReturnedItem {
  itemId: number; quantity: string
}

interface SaleInfo {
  id: number; amount: number; description: string | null; createdAt: Date; method: string
}

export function AddRefundModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'CASH' | 'NETWORK'>('CASH')
  const [description, setDescription] = useState('')
  
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [searchingInvoice, setSearchingInvoice] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null)
  
  const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([])
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([])
  const [comboboxOpen, setComboboxOpen] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    if (open && inventoryList.length === 0) {
      getAllInventoryItemsForSelect().then(setInventoryList)
    }
  }, [open])

  const handleSearchInvoice = async () => {
    if (!invoiceSearch) return
    setSearchingInvoice(true)
    try {
      const details = await getInvoiceDetails(invoiceSearch)
      if (details) {
        setInvoiceDetails(details)
        setAmount(details.totalAmount.toString())
        setReturnedItems(details.items.map((item: any) => ({
          itemId: item.itemId,
          quantity: item.quantitySold.toString()
        })))
      } else {
        alert('Invoice not found')
        setInvoiceDetails(null)
      }
    } catch (err) {
      alert('Error fetching invoice')
    } finally {
      setSearchingInvoice(false)
    }
  }

  const addReturnedItem = () => setReturnedItems(p => [...p, { itemId: 0, quantity: '1' }])
  const removeReturnedItem = (i: number) => setReturnedItems(p => p.filter((_, idx) => idx !== i))
  const updateReturnedItem = (i: number, field: keyof ReturnedItem, val: string | number) => {
    setReturnedItems(p => p.map((ci, idx) => idx === i ? { ...ci, [field]: val } : ci))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await recordRefund({
        amount: parseFloat(amount),
        method,
        description,
        invoiceNumber: invoiceDetails?.invoiceNumber || undefined,
        returnedItems: returnedItems
          .filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0)
          .map(ci => ({ itemId: ci.itemId, quantity: parseFloat(ci.quantity) })),
      })
      
      setOpen(false)
      setAmount('')
      setMethod('CASH')
      setDescription('')
      setInvoiceSearch('')
      setInvoiceDetails(null)
      setReturnedItems([])
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
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-950">
          <div className="h-2 w-full bg-gradient-to-r from-red-400 via-rose-500 to-red-600" />
          <div className="p-8 md:p-10 space-y-8">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl shadow-inner">
                    <Undo2 size={28} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="leading-tight">Refund Process</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Returns & Adjustments</span>
                  </div>
                </DialogTitle>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invoice Search Section */}
              <div className="p-6 bg-red-50/50 dark:bg-red-900/10 rounded-[2rem] border border-red-100 dark:border-red-900/30 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 ml-1">Search Sales Invoice</Label>
                  <div className="flex gap-2">
                    <Input
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="e.g. INV-1714400000"
                      className="h-12 rounded-xl border-transparent bg-white dark:bg-gray-950 focus:border-red-500 font-bold px-4"
                    />
                    <Button 
                      type="button" 
                      onClick={handleSearchInvoice} 
                      disabled={searchingInvoice || !invoiceSearch} 
                      className="h-12 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px]"
                    >
                      {searchingInvoice ? '...' : 'Find'}
                    </Button>
                  </div>
                </div>
                {invoiceDetails && (
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-gray-400">Total Paid</span>
                      <span className="text-lg font-black text-red-600">{invoiceDetails.totalAmount} SAR</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[10px] font-black uppercase text-gray-400">Date</span>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{new Date(invoiceDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount & Method */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Refund Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 font-black text-sm">SAR</span>
                    <Input
                      type="number" step="0.01" required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 pl-11 rounded-xl border-none bg-white dark:bg-gray-950 font-black text-lg tabular-nums text-red-600"
                    />
                  </div>
                </div>
                <div className="space-y-2 p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="h-11 rounded-xl border-none bg-white dark:bg-gray-950 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="CASH" className="font-bold">Cash</SelectItem>
                      <SelectItem value="NETWORK" className="font-bold">Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items Restock */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Restock Items</Label>
                  <button
                    type="button" onClick={addReturnedItem}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase"
                  >
                    <Plus size={12} strokeWidth={3} /> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {returnedItems.map((ci, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
                      <div className="flex-1">
                        <Popover open={!!comboboxOpen[index]} onOpenChange={(v) => setComboboxOpen(p => ({ ...p, [index]: v }))}>
                          <PopoverTrigger render={
                            <button className="flex w-full items-center justify-between h-10 rounded-xl bg-gray-50 dark:bg-gray-950 px-3 text-xs font-bold truncate">
                              <span className="truncate">
                                {ci.itemId ? inventoryList.find(i => i.id === ci.itemId)?.name : "Select Item"}
                              </span>
                              <ChevronsUpDown size={14} className="opacity-40 shrink-0" />
                            </button>
                          } />
                          <PopoverContent className="p-0 rounded-xl shadow-2xl border-none overflow-hidden">
                            <Command>
                              <CommandInput placeholder="Search..." />
                              <CommandList className="max-h-[200px]">
                                {inventoryList.map(item => (
                                  <CommandItem
                                    key={item.id}
                                    onSelect={() => {
                                      updateReturnedItem(index, 'itemId', item.id)
                                      setComboboxOpen(p => ({ ...p, [index]: false }))
                                    }}
                                    className="py-2.5 px-4 cursor-pointer"
                                  >
                                    <span className="font-bold">{item.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Input
                        type="number" step="0.1" min="0" placeholder="Qty"
                        value={ci.quantity}
                        onChange={e => updateReturnedItem(index, 'quantity', e.target.value)}
                        className="w-16 h-10 rounded-xl border-none bg-gray-50 dark:bg-gray-950 font-black text-center text-xs"
                      />
                      <button type="button" onClick={() => removeReturnedItem(index)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Reason / Notes</Label>
                <Input
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Why is this being returned?"
                  className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 focus:bg-white transition-all font-medium px-4"
                />
              </div>

              <Button
                type="submit" disabled={loading}
                className="w-full h-16 text-lg font-black uppercase tracking-widest text-white bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl shadow-2xl shadow-red-500/20 active:scale-[0.98] transition-all mt-4"
              >
                {loading ? 'Processing...' : 'Confirm Refund'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
