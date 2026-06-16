'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart, Plus, Trash2, DollarSign, Wifi, Users,
  Package, Search, X, CheckCircle2, Printer, Tag, ChevronDown, ArrowRight, ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/providers/language-provider'
import { createPurchaseOrder, getAllInventoryItemsForSelect } from '@/actions/inventory'
import { getAgents } from '@/actions/agents'
import { getPrinterSettings, getLabelTemplates } from '@/actions/barcodes'
import { printZebraLabels } from '@/lib/zebra-zpl'
import { DEFAULT_LABEL_CONFIG } from '@/lib/barcode'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStore, Transaction } from '@/store/useStore'

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
          'w-full flex items-center justify-between h-11 rounded-2xl border-2 px-4 text-sm font-bold transition-all bg-gray-50/50 dark:bg-gray-900',
          open
            ? 'border-blue-500 shadow-lg shadow-blue-500/10'
            : 'border-gray-100 dark:border-gray-800 hover:border-blue-300'
        )}
      >
        <span className={cn('flex items-center gap-2.5 truncate', !selected && 'text-gray-400 font-medium')}>
          <Package size={16} className="text-blue-500 shrink-0" />
          {selected ? selected.name : 'Select product...'}
        </span>
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-2xl overflow-hidden max-h-72 flex flex-col">
          <div className="p-2.5 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search by product name or SKU..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400 font-medium">No items found</p>
            )}
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); setOpen(false); setQuery('') }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition group border-b border-gray-50 dark:border-gray-900/50 last:border-0"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.name}</p>
                  {item.sku && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    'text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block',
                    item.currentStock <= 0
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/20'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                  )}>
                    {item.currentStock} {item.unit}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Inline supplier picker ──────────────────────────────────────────────────────
function SupplierPicker({
  agents,
  selectedId,
  onSelect,
  placeholder,
}: {
  agents: Agent[]
  selectedId: string
  onSelect: (id: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = agents.find(a => String(a.id) === selectedId)

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
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between h-11 rounded-2xl border-2 px-4 text-sm font-bold transition-all bg-gray-50/50 dark:bg-gray-900',
          open
            ? 'border-blue-500 shadow-lg shadow-blue-500/10'
            : 'border-gray-100 dark:border-gray-800 hover:border-blue-300'
        )}
      >
        <span className={cn('flex items-center gap-2.5 truncate', !selected && 'text-gray-400 font-medium')}>
          <Users size={16} className="text-blue-500 shrink-0" />
          {selected ? (selected.companyName ? `${selected.name} (${selected.companyName})` : selected.name) : placeholder}
        </span>
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-2xl overflow-hidden max-h-60 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onSelect('none'); setOpen(false) }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition group border-b border-gray-50 dark:border-gray-900/50"
          >
            <span className="text-sm font-medium text-gray-400 italic">No Supplier</span>
          </button>
          {agents.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onSelect(String(a.id)); setOpen(false) }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition group border-b border-gray-50 dark:border-gray-900/50 last:border-0"
            >
              <div className="min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{a.name}</p>
                {a.companyName && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{a.companyName}</p>}
              </div>
            </button>
          ))}
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
  const [isPrinting, setIsPrinting] = useState(false)
  const [step, setStep] = useState<'form' | 'labels'>('form')

  const [agentId, setAgentId] = useState('none')
  const [method, setMethod] = useState<'CASH' | 'NETWORK' | 'CREDIT'>('CASH')
  const [note, setNote] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ itemId: 0, quantity: '', unitCost: '', printQty: 1 }])

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [submittedLines, setSubmittedLines] = useState<LineItem[]>([])

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
  }

  const addLine = () => setLineItems(p => [...p, { itemId: 0, quantity: '', unitCost: '', printQty: 1 }])
  const removeLine = (i: number) => setLineItems(p => p.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string | number) =>
    setLineItems(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  const updateSubmittedLine = (i: number, field: keyof LineItem, value: string | number) =>
    setSubmittedLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const totalCost = lineItems.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0)
  const validLines = lineItems.filter(l => l.itemId > 0 && parseFloat(l.quantity) > 0)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
      setSubmittedLines(validLines.map(l => ({ ...l, printQty: parseFloat(l.quantity) || 1 })))
      router.refresh()
      setStep('labels')
    } catch (err: any) {
      toast.error('Purchase Failed', { description: err.message || 'An error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async (item: InventoryItem, qty: number) => {
    setIsPrinting(true)
    const loadToastId = toast.loading('Sending to printer...')
    try {
      const [settings, templates] = await Promise.all([
        getPrinterSettings(),
        getLabelTemplates(),
      ])
      
      let config = templates[0]?.config as any || DEFAULT_LABEL_CONFIG
      
      // Attempt to find the specific template by name if they have multiple
      const exactTemplate = templates.find(t => t.name.includes('39x26'))
      if (exactTemplate) {
         config = exactTemplate.config as any
      }

      await printZebraLabels([{ item: item as any, quantity: qty }], config, settings, 1)
      
      toast.success('Print job sent to Zebra printer', { id: loadToastId })
    } catch (err: any) {
      toast.error(err.message || 'Printing failed. Is QZ Tray running?', { id: loadToastId })
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <button className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-3 sm:px-5 font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 min-w-0 shrink',
          triggerClassName
        )} />
      }>
        <ShoppingCart size={16} className="shrink-0" />
        <span className="truncate text-center leading-tight">{t('addPurchase')}</span>
      </DialogTrigger>

      <DialogContent className={cn(
        "w-full max-w-none p-0 border-none shadow-3xl bg-white dark:bg-gray-950 flex flex-col overflow-hidden font-sans",
        "fixed inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 rounded-t-[1.75rem] rounded-b-none",
        "h-[100dvh] max-h-[100dvh]",
        "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2",
        "sm:max-w-[95vw] sm:rounded-[2rem] lg:max-w-6xl lg:rounded-[3rem] sm:h-[90vh] sm:max-h-[92vh]"
      )}>
        
        {/* Header */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 dark:border-gray-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 shrink-0 safe-area-top">
          <div className="space-y-0.5 min-w-0 flex-1">
            <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl sm:rounded-2xl shrink-0">
                <ShoppingCart size={20} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <span className="block leading-tight">{step === 'form' ? 'Purchase Order' : 'Barcode Labels'}</span>
                <p className="text-[11px] sm:text-xs font-semibold text-gray-400 mt-0.5 line-clamp-2">
                  {step === 'form' ? 'Record inventory purchase items and balance stock' : 'Print barcode labels for incoming stock'}
                </p>
              </div>
            </DialogTitle>
          </div>

          {/* Steps Stepper */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300",
              step === 'form' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" : "bg-emerald-500 text-white"
            )}>
              {step === 'labels' ? <CheckCircle2 size={16} /> : '1'}
            </div>
            <div className={cn("w-10 h-0.5 rounded-full", step === 'labels' ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-800")} />
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300",
              step === 'labels' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" : "bg-gray-200 text-gray-400 dark:bg-gray-800"
            )}>
              2
            </div>
          </div>
        </div>

        {/* ── FORM STEP ── */}
        {step === 'form' && (
          <div className="flex-1 overflow-y-auto lg:overflow-hidden min-h-0 flex flex-col lg:flex-row bg-gray-50/50 dark:bg-gray-900/30">
            
            {/* Settings — after line items on mobile */}
            <div className="order-2 lg:order-1 w-full lg:w-[360px] shrink-0 lg:shrink-0 p-4 sm:p-6 lg:p-8 lg:border-r border-gray-100 dark:border-gray-900 lg:overflow-y-auto bg-white dark:bg-gray-950 border-t lg:border-t-0 border-gray-100 dark:border-gray-900">
              <div className="space-y-5 sm:space-y-6 max-w-md lg:max-w-none mx-auto lg:mx-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">{t('settings') || 'Purchase Settings'}</h3>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('supplier')}</Label>
                  <SupplierPicker
                    agents={agents}
                    selectedId={agentId}
                    onSelect={setAgentId}
                    placeholder={t('noSupplier')}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('method')}</Label>
                  <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-900 p-2 rounded-2xl">
                    {[
                      { key: 'CASH', icon: DollarSign, color: 'text-emerald-600' },
                      { key: 'NETWORK', icon: Wifi, color: 'text-blue-600' },
                      { key: 'CREDIT', icon: Users, color: 'text-amber-600' },
                    ].map(({ key, icon: Icon, color }) => (
                      <button key={key} type="button" onClick={() => setMethod(key as any)}
                        className={cn('flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-0 sm:h-12 rounded-xl text-[10px] sm:text-xs font-black transition-all min-w-0',
                          method === key ? `bg-white dark:bg-gray-950 ${color} shadow-sm` : 'text-gray-400 hover:text-gray-600'
                        )}>
                        <Icon size={14} className="shrink-0" />{key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('description')}</Label>
                  <textarea
                    placeholder="Describe this purchase order (optional)..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    className="w-full p-3 sm:p-4 text-sm font-medium rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50/30 focus:outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>

                {totalCost > 0 && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 text-white shadow-xl shadow-blue-500/10 space-y-1.5 lg:mt-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">{t('totalCost')}</span>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                      {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs font-bold ml-1 text-blue-200">SAR</span>
                    </p>
                    <p className="text-[10px] font-bold text-blue-100/70">
                      {validLines.length} active line{validLines.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Line items — first on mobile */}
            <div className="order-1 lg:order-2 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 lg:overflow-y-auto flex flex-col">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between gap-2 shrink-0 sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-2 -mx-1 px-1 lg:static lg:bg-transparent lg:backdrop-blur-none lg:p-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Items ({lineItems.length})</h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-1 text-xs font-black text-blue-600 hover:text-blue-700 transition shrink-0"
                  >
                    <Plus size={14} /> Add Line
                  </button>
                </div>

                <div className="space-y-3 pb-2">
                  {lineItems.map((line, idx) => {
                    const item = inventoryItems.find(i => i.id === line.itemId)
                    const subtotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitCost) || 0)
                    return (
                      <div key={idx} className="bg-white dark:bg-gray-950 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-4 relative group transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-800">
                        <div className="min-w-0">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Product</Label>
                          <ItemPicker
                            items={inventoryItems}
                            selectedId={line.itemId}
                            onSelect={item => updateLine(idx, 'itemId', item.id)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 min-w-0">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Qty {item ? `(${item.unit})` : ''}</Label>
                            <Input
                              type="number" step="0.1" min="0" placeholder="0"
                              value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                              className="h-11 rounded-xl sm:rounded-2xl border-2 border-gray-100 dark:border-gray-800 font-black text-sm"
                            />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Unit Cost</Label>
                            <Input
                              type="number" step="0.01" min="0" placeholder="0.00"
                              value={line.unitCost}
                              onChange={e => updateLine(idx, 'unitCost', e.target.value)}
                              className="h-11 rounded-xl sm:rounded-2xl border-2 border-gray-100 dark:border-gray-800 font-black text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-gray-900">
                          <div>
                            <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">Subtotal</Label>
                            <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                              {subtotal.toFixed(2)} <span className="text-[10px] font-medium text-gray-400">SAR</span>
                            </span>
                          </div>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition shrink-0"
                              aria-label="Remove line"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LABELS STEP ── */}
        {step === 'labels' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 space-y-5 sm:space-y-6 bg-gray-50/50 dark:bg-gray-900/30 min-h-0">
            <div className="max-w-3xl mx-auto w-full space-y-5 sm:space-y-6">
              
              <div className="p-4 sm:p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl sm:rounded-[2rem] border border-emerald-100 dark:border-emerald-900 flex items-start sm:items-center gap-3 sm:gap-4 shadow-sm animate-in zoom-in-95 duration-300">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shrink-0">
                  <CheckCircle2 size={22} strokeWidth={2.5} className="sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-400">Purchase Successful</h3>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500/80 mt-0.5">
                    Stock has been recorded. Review quantities below to print barcode labels.
                  </p>
                </div>
              </div>

              {/* Items Print List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 px-2">Print Configuration</h3>
                {submittedLines.map((line, idx) => {
                  const item = inventoryItems.find(i => i.id === line.itemId)
                  if (!item) return null
                  const hasBarcode = !!(item.sku || item.barcode)
                  return (
                    <div key={idx} className="bg-white dark:bg-gray-950 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-gray-900 dark:text-white truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.sku && <span className="text-[10px] text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded">{item.sku}</span>}
                          <span className="text-[10px] text-gray-400 font-bold">Qty: {line.quantity} {item.unit}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                        <div className="flex items-center justify-between sm:justify-start gap-3 flex-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Copies</Label>
                          <input
                            type="number" min="1" max="999"
                            value={line.printQty}
                            onChange={e => updateSubmittedLine(idx, 'printQty', parseInt(e.target.value) || 1)}
                            className="w-20 h-11 text-center text-sm font-black rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
                          />
                        </div>
                        <button
                          onClick={() => handlePrint(item, line.printQty)}
                          disabled={!hasBarcode || isPrinting}
                          className="flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black shadow-lg shadow-blue-500/10 transition-all active:scale-95 w-full sm:w-auto"
                        >
                          <Printer size={14} /> {isPrinting ? 'Printing...' : 'Print Labels'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-900 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center bg-white dark:bg-gray-950 gap-3 sm:gap-4 shrink-0 safe-area-bottom">
          <button
            type="button"
            onClick={() => { setOpen(false); reset() }}
            className="h-12 sm:h-14 px-6 sm:px-8 rounded-2xl text-gray-400 hover:text-gray-900 font-black text-sm flex items-center justify-center gap-2 transition w-full sm:w-auto"
          >
            <ArrowLeft size={16} />
            {step === 'form' ? t('cancel') : 'Close Workflow'}
          </button>

          {step === 'form' && (
            <button
              onClick={() => handleSubmit()}
              disabled={loading || validLines.length === 0}
              className="h-12 sm:h-14 px-8 sm:px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 w-full sm:w-auto"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Record Purchase</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
