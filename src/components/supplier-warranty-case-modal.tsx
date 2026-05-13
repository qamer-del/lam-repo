'use client'

import { useState } from 'react'
import { Truck, Plus, Trash2, Loader2, AlertTriangle, Package } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createSupplierWarrantyCase } from '@/actions/warranty'
import { toast } from 'sonner'

interface ReturnStockItem {
  id: number
  name: string
  sku?: string | null
  unit: string
  warrantyReturnStock: number
  unitCost: number
}

interface Agent {
  id: number
  name: string
  companyName?: string | null
}

interface Props {
  returnStockItems: ReturnStockItem[]
  agents: Agent[]
  onSuccess?: () => void
}

interface LineItem {
  itemId: number
  quantity: number
  notes: string
  maxQty: number
  itemName: string
  unit: string
}

export function SupplierWarrantyCaseModal({ returnStockItems, agents, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [agentId, setAgentId] = useState<number | ''>('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setAgentId('')
    setReferenceNumber('')
    setNotes('')
    setLines([])
  }

  const addLine = (item: ReturnStockItem) => {
    if (lines.find(l => l.itemId === item.id)) {
      toast.info(`${item.name} is already added`)
      return
    }
    setLines(prev => [...prev, {
      itemId: item.id,
      quantity: 1,
      notes: '',
      maxQty: item.warrantyReturnStock,
      itemName: item.name,
      unit: item.unit,
    }])
  }

  const removeLine = (itemId: number) => setLines(prev => prev.filter(l => l.itemId !== itemId))

  const updateLine = (itemId: number, field: 'quantity' | 'notes', value: any) => {
    setLines(prev => prev.map(l => l.itemId === itemId ? { ...l, [field]: value } : l))
  }

  const handleSubmit = async () => {
    if (lines.length === 0) {
      toast.warning('Add at least one item to the case')
      return
    }
    for (const line of lines) {
      if (line.quantity < 1 || line.quantity > line.maxQty) {
        toast.warning(`Invalid quantity for "${line.itemName}". Max: ${line.maxQty}`)
        return
      }
    }
    setSaving(true)
    try {
      await createSupplierWarrantyCase({
        agentId: agentId ? Number(agentId) : undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        items: lines.map(l => ({ itemId: l.itemId, quantity: l.quantity, notes: l.notes || undefined })),
      })
      toast.success('Supplier Return Case Created', {
        description: `Case with ${lines.length} item type(s) created successfully.`,
      })
      reset()
      setOpen(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error('Failed to create case', { description: err.message || String(err) })
    } finally {
      setSaving(false)
    }
  }

  const availableToAdd = returnStockItems.filter(i => !lines.find(l => l.itemId === i.id))

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <Button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95" />
      }>
        <Truck size={16} />
        New Supplier Return
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-950 max-h-[92vh] overflow-y-auto">
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-amber-500" />

        <div className="p-7 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl">
                <Truck size={26} className="text-orange-600" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span>Supplier Return Case</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Send defective items to supplier</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Supplier & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Supplier (Agent)</Label>
              <select
                value={agentId}
                onChange={e => setAgentId(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-12 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-900 focus:border-orange-500 font-bold px-4 text-sm"
              >
                <option value="">Select supplier...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.companyName ? ` (${a.companyName})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reference Number</Label>
              <Input
                placeholder="e.g. RMA-2025-001"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="h-12 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-900 focus:border-orange-500 font-bold px-5"
              />
            </div>
          </div>

          {/* Items selection */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Warranty Return Items</p>

            {returnStockItems.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <Package size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="font-black text-gray-400 text-sm">No warranty return items available</p>
                <p className="text-xs text-gray-400 mt-1">Process some replacements first</p>
              </div>
            ) : (
              <>
                {/* Available items to add */}
                {availableToAdd.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 ml-1">Click to add:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableToAdd.map(item => (
                        <button
                          key={item.id}
                          onClick={() => addLine(item)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all text-xs font-bold text-orange-700"
                        >
                          <Plus size={12} />
                          {item.name}
                          <span className="text-orange-400">({item.warrantyReturnStock} {item.unit})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Added line items */}
                {lines.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {lines.map(line => (
                      <div key={line.itemId} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-orange-100 dark:border-orange-900 rounded-2xl shadow-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-gray-900 dark:text-white truncate">{line.itemName}</p>
                          <p className="text-[10px] text-orange-500 font-bold">Max available: {line.maxQty} {line.unit}</p>
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            min={1}
                            max={line.maxQty}
                            value={line.quantity}
                            onChange={e => updateLine(line.itemId, 'quantity', Math.min(Number(e.target.value), line.maxQty))}
                            className="h-10 text-center rounded-xl border-none bg-gray-50 dark:bg-gray-800 font-black text-sm"
                          />
                        </div>
                        <button
                          onClick={() => removeLine(line.itemId)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes (Optional)</Label>
            <Input
              placeholder="e.g. All items show manufacturing defect on seal"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-12 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-900 focus:border-orange-500 font-medium px-5"
            />
          </div>

          {lines.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 flex gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                Creating this case will track {lines.reduce((s, l) => s + l.quantity, 0)} item(s) as sent to supplier. Stock will be updated when the supplier responds.
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={saving || lines.length === 0}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/25 disabled:opacity-40"
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating Case...</>
              : <><Truck size={16} className="mr-2" /> Create Supplier Return Case</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
