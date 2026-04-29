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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Undo2 size={18} />
              Process Sales Return / Refund
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold border-red-300 focus-visible:ring-red-500"
              />
            </div>

            <div className="grid gap-2">
              <Label>Refund Method</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger className="border-red-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash Refund (Deducts from Drawer)</SelectItem>
                  <SelectItem value="NETWORK">Network Refund (Deducts from Network Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Search Sales Invoice</Label>
              <div className="flex gap-2">
                <Input
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="e.g. INV-1714400000"
                  className="border-red-200"
                />
                <Button type="button" onClick={handleSearchInvoice} disabled={searchingInvoice} className="bg-red-100 text-red-700 hover:bg-red-200">
                  {searchingInvoice ? 'Searching...' : 'Search'}
                </Button>
              </div>
              {invoiceDetails && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-xl mt-1">
                  Found Invoice: {invoiceDetails.totalAmount} SAR on {new Date(invoiceDetails.createdAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="refund-description">{t('description')}</Label>
              <Input
                id="refund-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason for return..."
                className="border-red-200"
              />
            </div>

            {/* ── Returned Items ── */}
            <div className="rounded-2xl border border-red-100 overflow-hidden shadow-sm mt-2">
              <div className="w-full flex items-center justify-between px-4 py-3 bg-red-50/50 border-b border-red-100">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-red-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-red-700">Restock Items</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {returnedItems.map((ci, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Popover open={!!comboboxOpen[index]} onOpenChange={(v) => setComboboxOpen(p => ({ ...p, [index]: v }))}>
                        <PopoverTrigger
                          className={cn(
                            "flex w-full items-center justify-between h-11 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-red-50 transition-colors",
                            !ci.itemId && "text-muted-foreground"
                          )}
                        >
                          {ci.itemId
                            ? inventoryList.find((item) => item.id === ci.itemId)?.name
                            : "Select item to restock..."}
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
                                      updateReturnedItem(index, 'itemId', item.id)
                                      setComboboxOpen(p => ({ ...p, [index]: false }))
                                    }}
                                    className="py-2.5 font-medium cursor-pointer"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 text-red-600", ci.itemId === item.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>{item.name}</span>
                                      <span className="text-xs text-gray-500">{item.currentStock} {item.unit} in stock</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="w-20">
                      <Input
                        type="number" step="0.1" min="0" placeholder="Qty"
                        value={ci.quantity}
                        onChange={e => updateReturnedItem(index, 'quantity', e.target.value)}
                        className="h-11 rounded-xl text-sm font-bold border-red-200 text-center"
                      />
                    </div>
                    <button
                      type="button" onClick={() => removeReturnedItem(index)}
                      className="p-3 mt-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button" onClick={addReturnedItem}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-600 border-2 border-dashed border-red-200 rounded-xl hover:bg-red-50 transition mt-2"
                >
                  <Plus size={14} /> Add Restock Item
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-4 text-white bg-red-600 hover:bg-red-700 font-bold py-6">
              Confirm Refund
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
