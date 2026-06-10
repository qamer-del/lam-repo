'use client'

import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, Plus, Trash2, ArrowRight, Package, X, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createStockAdjustment } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLanguage } from '@/providers/language-provider'

interface InventoryItem {
  id: number; name: string; unit: string; currentStock: number; sku: string | null; unitCost: number
}

interface AdjLine {
  itemId: number; name: string; unit: string; currentStock: number; quantity: string; unitCost: number
}

const REASONS = [
  'Damaged', 'Expired', 'Lost / Stolen', 'Internal Use', 'Correction', 'Other'
]

function ItemPicker({ items, onSelect }: { items: InventoryItem[], onSelect: (i: InventoryItem) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(query.toLowerCase())))
    : items

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQuery('') }}
        className="w-full flex items-center justify-between h-11 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 px-4 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-all hover:border-gray-300"
      >
        <span className="flex items-center gap-2"><Plus size={16} /> Add Product to List</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-850 shadow-2xl overflow-hidden max-h-72 flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus type="text" placeholder="Search by product name..." value={query} onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map(item => (
              <button
                key={item.id} type="button"
                onClick={() => { onSelect(item); setOpen(false); setQuery('') }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50 dark:hover:bg-amber-900/10 transition border-b border-gray-50 dark:border-gray-900/50 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                  {item.sku && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
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

export function CreateAdjustmentModal({ items, triggerClassName }: { items: InventoryItem[], triggerClassName?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [type, setType] = useState<'OUT' | 'IN'>('OUT')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<AdjLine[]>([])

  const reset = () => {
    setType('OUT')
    setReason('')
    setNotes('')
    setLines([])
  }

  const addLine = (item: InventoryItem) => {
    if (lines.find(l => l.itemId === item.id)) {
      toast.error('Item already in list')
      return
    }
    setLines(p => [...p, { itemId: item.id, name: item.name, unit: item.unit, currentStock: item.currentStock, quantity: '', unitCost: item.unitCost }])
  }

  const updateLine = (idx: number, qty: string) => {
    const val = parseFloat(qty)
    const line = lines[idx]
    if (type === 'OUT' && val > line.currentStock) {
      toast.error(`Cannot remove more than current stock (${line.currentStock})`)
      qty = String(line.currentStock)
    }
    setLines(p => p.map((l, i) => i === idx ? { ...l, quantity: qty } : l))
  }

  const validLines = lines.filter(l => parseFloat(l.quantity) > 0)
  const totalImpact = validLines.reduce((sum, l) => sum + (parseFloat(l.quantity) * l.unitCost), 0)

  const handleSubmit = async () => {
    if (!reason) { toast.error('Reason required'); return }
    if (validLines.length === 0) { toast.error('Enter valid quantities'); return }

    setLoading(true)
    try {
      await createStockAdjustment({
        type,
        reason,
        notes,
        items: validLines.map(l => ({ itemId: l.itemId, quantity: parseFloat(l.quantity), unitCost: l.unitCost }))
      })
      toast.success('Adjustment Created', { description: `Stock has been ${type === 'OUT' ? 'deducted' : 'added'}.` })
      setOpen(false)
      reset()
      router.refresh()
    } catch (err: any) {
      toast.error('Failed to create adjustment', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <button className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-3 sm:px-5 font-black bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 min-w-0 shrink',
          triggerClassName
        )} />
      }>
        <SlidersHorizontal size={16} className="shrink-0" />
        <span className="truncate text-center leading-tight">Create Adjustment</span>
      </DialogTrigger>

      <DialogContent className="w-full max-w-2xl p-0 border-none shadow-2xl rounded-2xl overflow-hidden font-sans">
        <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal size={24} strokeWidth={2.5} />
          </div>
          <div>
            <DialogTitle className="text-xl font-black text-gray-900 dark:text-white">Stock Adjustment</DialogTitle>
            <p className="text-sm font-semibold text-gray-400">Record stock loss, damage, or audit corrections.</p>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</Label>
              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
                <button
                  type="button" onClick={() => setType('OUT')}
                  className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition", type === 'OUT' ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm' : 'text-gray-500')}
                >
                  Deduct (OUT)
                </button>
                <button
                  type="button" onClick={() => setType('IN')}
                  className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition", type === 'IN' ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm' : 'text-gray-500')}
                >
                  Add (IN)
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reason</Label>
              <select
                value={reason} onChange={e => setReason(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-bold outline-none"
              >
                <option value="">Select Reason...</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Note (Optional)</Label>
            <Input placeholder="Extra details..." value={notes} onChange={e => setNotes(e.target.value)} className="h-11" />
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-900">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Products to Adjust</Label>
            
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white dark:bg-gray-950 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{line.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Stock: {line.currentStock} {line.unit}</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <Input
                      type="number" min="0" max={type === 'OUT' ? line.currentStock : undefined} step="0.1" placeholder="Qty"
                      value={line.quantity}
                      onChange={e => updateLine(idx, e.target.value)}
                      className={cn("h-9 text-right font-black", type === 'OUT' ? 'text-amber-600 border-amber-200' : 'text-emerald-600 border-emerald-200')}
                    />
                  </div>
                  <button type="button" onClick={() => setLines(p => p.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <ItemPicker items={items} onSelect={addLine} />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-900 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Value Impact</p>
            <p className={cn("text-xl font-black tabular-nums", type === 'OUT' ? 'text-amber-600' : 'text-emerald-600')}>
              {type === 'OUT' ? '-' : '+'}{totalImpact.toFixed(2)} SAR
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || validLines.length === 0 || !reason}
            className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm flex items-center gap-2 transition"
          >
            {loading ? 'Saving...' : 'Apply Adjustment'} <ArrowRight size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
