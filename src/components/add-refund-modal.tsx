'use client'

import { useState, useEffect } from 'react'
import { Undo2, Plus, Trash2, ChevronsUpDown, AlertTriangle, Search, CheckCircle2 } from 'lucide-react'
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

type RefundMethod = 'CASH' | 'NETWORK' | 'TABBY' | 'TAMARA'

interface InventoryItem {
  id: number; name: string; sku: string | null; unit: string; currentStock: number; sellingPrice: number
}

interface ReturnedItem {
  itemId: number
  quantity: string
  shouldRestock: boolean
  priceAtSale?: number
  quantityAlreadyReturned?: number
}

const REFUND_REASONS = [
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
  { value: 'DAMAGED_ITEM',     label: 'Damaged / Defective' },
  { value: 'WRONG_ITEM',       label: 'Wrong Item Delivered' },
  { value: 'EXPIRED',          label: 'Expired Product' },
  { value: 'OTHER',            label: 'Other' },
]

const METHOD_LABELS: Record<RefundMethod, string> = {
  CASH: 'Cash', NETWORK: 'Network', TABBY: 'Tabby', TAMARA: 'Tamara',
}

const METHOD_COLORS: Record<RefundMethod, string> = {
  CASH:    'bg-emerald-100 text-emerald-700 border-emerald-300',
  NETWORK: 'bg-blue-100    text-blue-700    border-blue-300',
  TABBY:   'bg-purple-100  text-purple-700  border-purple-300',
  TAMARA:  'bg-pink-100    text-pink-700    border-pink-300',
}

const EMPTY: ReturnedItem[] = []

export function AddRefundModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const [amount, setAmount]           = useState('')
  const [method, setMethod]           = useState<RefundMethod>('CASH')
  const [reason, setReason]           = useState('CUSTOMER_REQUEST')
  const [description, setDescription] = useState('')

  const [invoiceSearch, setInvoiceSearch]   = useState('')
  const [searchingInvoice, setSearchingInvoice] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null)

  const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>(EMPTY)
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([])
  const [comboboxOpen, setComboboxOpen]   = useState<{ [k: number]: boolean }>({})

  useEffect(() => {
    if (open && inventoryList.length === 0) {
      getAllInventoryItemsForSelect().then(setInventoryList)
    }
  }, [open])

  // Auto-calculate amount from item lines
  useEffect(() => {
    if (!invoiceDetails) return
    const total = returnedItems.reduce((sum, item) => {
      const qty   = parseFloat(item.quantity) || 0
      const price = item.priceAtSale || 0
      return sum + qty * price
    }, 0)
    setAmount(total.toFixed(2))
  }, [returnedItems, invoiceDetails])

  // Auto-select refund method from original invoice
  useEffect(() => {
    if (!invoiceDetails?.paymentMethods?.length) return
    const firstMethod = invoiceDetails.paymentMethods[0] as RefundMethod
    if (firstMethod && METHOD_LABELS[firstMethod]) setMethod(firstMethod)
  }, [invoiceDetails])

  const handleSearchInvoice = async () => {
    if (!invoiceSearch.trim()) return
    setSearchingInvoice(true)
    setError(null)
    setInvoiceDetails(null)
    try {
      const details = await getInvoiceDetails(invoiceSearch.trim())
      if (details) {
        setInvoiceDetails(details)
        setReturnedItems(
          details.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantitySold.toString(),
            shouldRestock: true,
            priceAtSale: item.sellingPrice,
            quantityAlreadyReturned: item.quantityAlreadyReturned ?? 0,
          }))
        )
      } else {
        setError('Invoice not found. Please check the number and try again.')
      }
    } catch {
      setError('Error fetching invoice. Please try again.')
    } finally {
      setSearchingInvoice(false)
    }
  }

  const addReturnedItem = () =>
    setReturnedItems(p => [...p, { itemId: 0, quantity: '1', shouldRestock: true }])

  const removeReturnedItem = (i: number) =>
    setReturnedItems(p => p.filter((_, idx) => idx !== i))

  const updateReturnedItem = (i: number, field: keyof ReturnedItem, val: any) =>
    setReturnedItems(p => p.map((ci, idx) => idx === i ? { ...ci, [field]: val } : ci))

  const resetForm = () => {
    setAmount(''); setMethod('CASH'); setReason('CUSTOMER_REQUEST')
    setDescription(''); setInvoiceSearch(''); setInvoiceDetails(null)
    setReturnedItems(EMPTY); setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Refund amount must be greater than zero.')
      return
    }

    setLoading(true)
    try {
      await recordRefund({
        amount: parsedAmount,
        method,
        reason,
        description,
        invoiceNumber: invoiceDetails?.invoiceNumber || undefined,
        returnedItems: returnedItems
          .filter(ci => ci.itemId > 0 && parseFloat(ci.quantity) > 0)
          .map(ci => ({
            itemId: ci.itemId,
            quantity: parseFloat(ci.quantity),
            shouldRestock: ci.shouldRestock,
          })),
      })
      resetForm()
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to record refund. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <DialogTrigger render={
          <Button variant="outline" className={cn('flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300', triggerClassName)} />
        }>
          <Undo2 size={15} />
          Refund
        </DialogTrigger>

        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-950">
          {/* Accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-600" />

          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
                  <Undo2 size={20} strokeWidth={2.5} />
                </div>
                Refund
                <span className="text-sm font-normal text-gray-400 ml-1">/ Sales Return</span>
              </DialogTitle>
            </DialogHeader>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── Invoice search ── */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Invoice Number <span className="normal-case font-normal text-gray-400">(optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchInvoice())}
                    placeholder="e.g. INV-1714400000"
                    className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:border-red-400 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    onClick={handleSearchInvoice}
                    disabled={searchingInvoice || !invoiceSearch.trim()}
                    className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold gap-2"
                  >
                    <Search size={14} />
                    {searchingInvoice ? '...' : 'Find'}
                  </Button>
                </div>

                {/* Invoice found summary */}
                {invoiceDetails && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Invoice Total</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                          {invoiceDetails.totalAmount.toFixed(2)} <span className="text-xs font-normal text-gray-500">SAR</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium">Date</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {new Date(invoiceDetails.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    </div>

                    {/* Double-refund warning */}
                    {invoiceDetails.hasExistingRefund && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                        <span>
                          This invoice was already refunded{' '}
                          <strong>{invoiceDetails.alreadyRefunded.toFixed(2)} SAR</strong>. Verify before proceeding.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Amount, Method, Reason ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (SAR)</Label>
                  <Input
                    type="number" step="0.01" min="0" required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 rounded-xl border-gray-200 dark:border-gray-700 font-bold tabular-nums text-red-600"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 dark:border-gray-700 font-medium text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {(Object.keys(METHOD_LABELS) as RefundMethod[]).map(m => (
                        <SelectItem key={m} value={m} className="font-medium">
                          {METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</Label>
                  <Select value={reason} onValueChange={(v) => { if (v) setReason(v) }}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 dark:border-gray-700 font-medium text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {REFUND_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value} className="font-medium">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Returned Items ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Returned Items &amp; Restocking
                  </Label>
                  <button
                    type="button"
                    onClick={addReturnedItem}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition text-xs font-semibold"
                  >
                    <Plus size={12} strokeWidth={2.5} /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {returnedItems.map((ci, index) => {
                    const selectedItem = inventoryList.find(i => i.id === ci.itemId)
                    const alreadyReturned = ci.quantityAlreadyReturned || 0
                    return (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
                        {/* Item selector + qty */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <Popover open={!!comboboxOpen[index]} onOpenChange={(v) => setComboboxOpen(p => ({ ...p, [index]: v }))}>
                              <PopoverTrigger render={
                                <button className="flex w-full items-center justify-between h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 text-sm font-medium truncate hover:border-gray-300 transition">
                                  <span className="truncate text-left">
                                    {ci.itemId ? selectedItem?.name ?? 'Unknown' : 'Select item…'}
                                  </span>
                                  <ChevronsUpDown size={14} className="opacity-40 shrink-0 ml-1" />
                                </button>
                              } />
                              <PopoverContent className="p-0 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-72">
                                <Command>
                                  <CommandInput placeholder="Search items…" />
                                  <CommandList className="max-h-[180px]">
                                    <CommandEmpty>No items found.</CommandEmpty>
                                    <CommandGroup>
                                      {inventoryList.map(item => (
                                        <CommandItem
                                          key={item.id}
                                          onSelect={() => {
                                            updateReturnedItem(index, 'itemId', item.id)
                                            setComboboxOpen(p => ({ ...p, [index]: false }))
                                          }}
                                          className="py-2 px-3 cursor-pointer"
                                        >
                                          <span className="font-medium">{item.name}</span>
                                          <span className="ml-auto text-xs text-gray-400">{item.sellingPrice} SAR</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Input
                            type="number" step="0.1" min="0"
                            placeholder="Qty"
                            value={ci.quantity}
                            onChange={e => updateReturnedItem(index, 'quantity', e.target.value)}
                            className="w-16 h-9 rounded-lg border-gray-200 dark:border-gray-700 font-bold text-center text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeReturnedItem(index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Restock toggle + meta */}
                        <div className="flex items-center justify-between px-0.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ci.shouldRestock}
                              onChange={e => updateReturnedItem(index, 'shouldRestock', e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-xs font-medium text-gray-500">Return to stock</span>
                          </label>
                          <div className="flex items-center gap-2 text-xs">
                            {alreadyReturned > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                                {alreadyReturned} already returned
                              </span>
                            )}
                            {ci.priceAtSale && (
                              <span className="text-gray-400 font-medium">
                                {ci.priceAtSale.toFixed(2)} SAR/unit
                              </span>
                            )}
                            {ci.itemId > 0 && parseFloat(ci.quantity) > 0 && ci.priceAtSale && (
                              <span className="font-bold text-red-600">
                                = {(parseFloat(ci.quantity) * ci.priceAtSale).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Notes ── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Additional details about the return…"
                  className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-medium text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all gap-2"
              >
                <Undo2 size={16} />
                {loading ? 'Processing…' : 'Confirm Refund'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
