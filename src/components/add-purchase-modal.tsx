'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart, Plus, Trash2, DollarSign, Wifi, Users,
  Package, Search, X, CheckCircle2, Printer, Tag, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/providers/language-provider'
import { createPurchaseOrder, getAllInventoryItemsForSelect } from '@/actions/inventory'
import { getAgents } from '@/actions/agents'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStore, Transaction } from '@/store/useStore'
import { DEFAULT_LABEL_CONFIG } from '@/lib/barcode'
import { LabelPreview } from '@/components/label-preview'

interface InventoryItem {
  id: number
  name: string
  unit: string
  currentStock: number
  sku: string | null
  barcode: string | null
  barcodeType: string | null
  sellingPrice: number
  hasWarranty: boolean
}

interface Agent { id: number; name: string; companyName?: string | null }

interface LineItem {
  itemId: number
  quantity: string
  unitCost: string
  printQty: number
}

// ── Inline product picker ──────────────────────────────────────────────────────
function ItemPicker({
  items,
  selectedId,
  onSelect,
}: {
  items: InventoryItem[]
  selectedId: number
  onSelect: (item: InventoryItem) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = items.find(i => i.id === selectedId)
  const filtered = query.trim()
    ? items.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        (i.sku && i.sku.toLowerCase().includes(query.toLowerCase()))
      )
    : items

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQuery('') }}
        className={cn(
          'w-full flex items-center justify-between h-11 rounded-xl border-2 px-3 text-sm font-medium transition-all',
          open
            ? 'border-blue-500 bg-white dark:bg-gray-900'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300'
        )}
      >
        <span className={cn('flex items-center gap-2 truncate', !selected && 'text-gray-400')}>
          <Package size={15} className="text-blue-400 shrink-0" />
          {selected ? selected.name : 'Select product...'}
        </span>
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search by name or SKU..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-center py-6 text-sm text-gray-400">No items found</p>
            )}
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); setOpen(false); setQuery('') }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                  {item.sku && <p className="text-[10px] text-gray-400 font-mono">{item.sku}</p>}
                </div>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full',
                  item.currentStock <= 0
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-700'
                )}>
                  {item.currentStock} {item.unit}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AddPurchaseModal({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'labels'>('form')

  const [agentId, setAgentId] = useState('none')
  const [method, setMethod] = useState<'CASH' | 'NETWORK' | 'CREDIT'>('CASH')
  const [note, setNote] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ itemId: 0, quantity: '', unitCost: '', printQty: 1 }])

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [submittedLines, setSubmittedLines] = useState<LineItem[]>([])
  const [previewItem, setPreviewItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
    if (open) {
      getAllInventoryItemsForSelect().then(data => setInventoryItems(data as InventoryItem[]))
      getAgents().then(setAgents)
    }
  }, [open])

  const reset = () => {
    setLineItems([{ itemId: 0, quantity: '', unitCost: '', printQty: 1 }])
    setAgentId('none')
    setNote('')
    setMethod('CASH')
    setStep('form')
    setPreviewItem(null)
  }

  const addLine = () => setLineItems(p => [...p, { itemId: 0, quantity: '', unitCost: '', printQty: 1 }])
  const removeLine = (i: number) => setLineItems(p => p.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string | number) =>
    setLineItems(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const totalCost = lineItems.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0)
  const validLines = lineItems.filter(l => l.itemId > 0 && parseFloat(l.quantity) > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validLines.length === 0) {
      toast.warning('No valid items', { description: 'Add at least one item with quantity.' })
      return
    }
    if (method === 'CREDIT' && agentId === 'none') {
      toast.warning('Supplier required', { description: 'Select a supplier for credit purchases.' })
      return
    }
    setLoading(true)
    try {
      const result = await createPurchaseOrder({
        agentId: agentId !== 'none' ? parseInt(agentId) : undefined,
        method,
        note: note || undefined,
        items: validLines.map(l => ({
          itemId: l.itemId,
          quantity: parseFloat(l.quantity),
          unitCost: parseFloat(l.unitCost) || 0,
        })),
      })
      if (result) useStore.getState().addTransaction(result as Transaction)
      toast.success('Purchase Recorded', {
        description: `${method} purchase of ${totalCost.toFixed(2)} SAR recorded.`,
      })
      setSubmittedLines([...validLines])
      router.refresh()
      setStep('labels')
    } catch (err: any) {
      toast.error('Purchase Failed', { description: err.message || 'An error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = (item: InventoryItem, qty: number) => {
    const win = window.open('', '_blank')
    if (!win) return
    const rows = Array.from({ length: qty }, (_, i) => `
      <div style="display:inline-block;margin:2mm;border:0.5px dashed #ccc;padding:2mm;">
        <strong style="font-size:9pt;">${item.name}</strong><br/>
        ${item.sku ? `<span style="font-size:7pt;color:#666">${item.sku}</span><br/>` : ''}
        <span style="font-size:8pt;color:green">${item.sellingPrice.toFixed(2)} SAR</span>
      </div>
    `).join('')
    win.document.write(`<html><head><title>Labels</title><style>body{font-family:sans-serif;margin:4mm}</style></head><body>${rows}</body></html>`)
    win.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <button className={cn(
          'inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95',
          triggerClassName
        )} />
      }>
        <ShoppingCart size={16} />
        {t('addPurchase')}
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-full p-0 border-none shadow-2xl rounded-3xl bg-white dark:bg-gray-950 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shrink-0" />

        {/* Header */}
        <DialogHeader className="px-7 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <ShoppingCart size={22} className="text-blue-600" />
            </div>
            <div>
              <span>{step === 'form' ? t('addPurchase') : 'Print Barcode Labels'}</span>
              <p className="text-xs font-medium text-gray-400 mt-0.5">
                {step === 'form' ? 'Record incoming stock from a supplier' : 'Choose quantities and open print preview'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ── FORM STEP ── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-7 py-5 space-y-6">

              {/* Supplier + Method row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('supplier')}</Label>
                  <Select value={agentId} onValueChange={v => { if (v) setAgentId(v) }}>
                    <SelectTrigger className="h-11 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-medium">
                      <SelectValue placeholder={t('noSupplier')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-none">
                      <SelectItem value="none" className="text-gray-400 italic">{t('noSupplier')}</SelectItem>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={String(a.id)} className="font-medium py-2.5">
                          {a.name}{a.companyName ? ` — ${a.companyName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('method')}</Label>
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl h-11">
                    {[
                      { key: 'CASH', icon: DollarSign, color: 'text-emerald-600' },
                      { key: 'NETWORK', icon: Wifi, color: 'text-blue-600' },
                      { key: 'CREDIT', icon: Users, color: 'text-amber-600' },
                    ].map(({ key, icon: Icon, color }) => (
                      <button key={key} type="button" onClick={() => setMethod(key as any)}
                        className={cn('flex items-center justify-center gap-1.5 rounded-lg text-xs font-black transition-all',
                          method === key ? `bg-white dark:bg-gray-900 ${color} shadow-sm` : 'text-gray-400 hover:text-gray-600'
                        )}>
                        <Icon size={13} />{key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t('purchaseItems')} <span className="text-blue-500 ml-1">{validLines.length} item{validLines.length !== 1 ? 's' : ''}</span>
                  </Label>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {lineItems.map((line, idx) => {
                    const item = inventoryItems.find(i => i.id === line.itemId)
                    const subtotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitCost) || 0)
                    return (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <ItemPicker
                              items={inventoryItems}
                              selectedId={line.itemId}
                              onSelect={item => updateLine(idx, 'itemId', item.id)}
                            />
                          </div>
                          {lineItems.length > 1 && (
                            <button type="button" onClick={() => removeLine(idx)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shrink-0 mt-0.5">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t('quantity')} {item ? `(${item.unit})` : ''}</Label>
                            <Input type="number" step="0.1" min="0" placeholder="0"
                              value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                              className="h-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t('unitCost')} (SAR)</Label>
                            <Input type="number" step="0.01" min="0" placeholder="0.00"
                              value={line.unitCost}
                              onChange={e => updateLine(idx, 'unitCost', e.target.value)}
                              className="h-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold text-sm" />
                          </div>
                        </div>

                        {subtotal > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-medium">Subtotal</span>
                            <span className="text-sm font-black text-blue-600">{subtotal.toFixed(2)} SAR</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button type="button" onClick={addLine}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-blue-600 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-2xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                  <Plus size={15} /> Add Another Item
                </button>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('description')}</Label>
                <Input placeholder="Optional note..." value={note}
                  onChange={e => setNote(e.target.value)}
                  className="h-11 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-medium" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0 space-y-3">
              {totalCost > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <span className="text-sm font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">{t('totalCost')}</span>
                  <span className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-300">{totalCost.toFixed(2)} SAR</span>
                </div>
              )}
              <button type="submit" disabled={loading || validLines.length === 0}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  : <><CheckCircle2 size={16} /> Record Purchase</>
                }
              </button>
            </div>
          </form>
        )}

        {/* ── LABELS STEP ── */}
        {step === 'labels' && (
          <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                Purchase recorded successfully. Print barcode labels for the received items below.
              </p>
            </div>

            <div className="space-y-3">
              {submittedLines.filter(l => l.itemId > 0).map((line, idx) => {
                const item = inventoryItems.find(i => i.id === line.itemId)
                if (!item) return null
                const hasBarcode = !!(item.sku || item.barcode)
                return (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku || 'No SKU'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Qty received: <strong>{line.quantity} {item.unit}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Labels</Label>
                          <input
                            type="number" min="1" max="999"
                            value={line.printQty}
                            onChange={e => updateLine(idx, 'printQty', parseInt(e.target.value) || 1)}
                            className="w-16 h-9 text-center text-sm font-black rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                          />
                        </div>
                        <button
                          onClick={() => handlePrint(item, line.printQty)}
                          disabled={!hasBarcode}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black transition-all active:scale-95 mt-4"
                        >
                          <Printer size={14} /> Print
                        </button>
                      </div>
                    </div>

                    {!hasBarcode && (
                      <p className="mt-2 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5 font-medium">
                        ⚠ No SKU or barcode — assign one in inventory to enable label printing.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => { setOpen(false); reset() }}
              className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-black text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
            >
              Done — Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
