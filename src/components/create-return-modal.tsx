'use client'

import { useState, useRef, useEffect } from 'react'
import { Undo2, Plus, Trash2, ArrowRight, Package, X, ChevronDown, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPurchaseReturn } from '@/actions/returns'
import { getAgents } from '@/actions/agents'
import { getPurchaseOrders } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLanguage } from '@/providers/language-provider'

interface Agent { id: number; name: string; companyName?: string | null }
interface PurchaseOrder {
  id: number; totalCost: number; method: string; agent: Agent | null
  items: { id: number; quantity: number; unitCost: number; totalCost: number; item: { id: number; name: string; unit: string } }[]
}

interface ReturnLine {
  poItemId: number // The ID of the item in the inventory
  name: string
  unit: string
  maxQuantity: number
  returnQuantity: string
  unitCost: number
}

export function CreateReturnModal({
  triggerClassName
}: {
  triggerClassName?: string
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    if (open) {
      getPurchaseOrders().then(setPurchases)
      getAgents().then(setAgents)
    }
  }, [open])
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('none')
  const [selectedPOId, setSelectedPOId] = useState<string>('none')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ReturnLine[]>([])

  const reset = () => {
    setSelectedAgentId('none')
    setSelectedPOId('none')
    setReason('')
    setNotes('')
    setLines([])
  }

  // Filter POs by selected agent
  const availablePOs = purchases.filter(po => 
    selectedAgentId !== 'none' ? po.agent?.id === parseInt(selectedAgentId) : po.agent === null
  )

  const selectedPO = purchases.find(po => po.id === parseInt(selectedPOId))

  // Populate items when a PO is selected
  useEffect(() => {
    if (selectedPO) {
      setLines(selectedPO.items.map(i => ({
        poItemId: i.item.id,
        name: i.item.name,
        unit: i.item.unit,
        maxQuantity: i.quantity,
        returnQuantity: '',
        unitCost: i.unitCost
      })))
    } else {
      setLines([])
    }
  }, [selectedPOId])

  const updateLine = (idx: number, qty: string) => {
    const val = parseFloat(qty)
    const max = lines[idx].maxQuantity
    if (val > max) {
      toast.error(`Cannot return more than purchased (${max})`)
      qty = String(max)
    }
    setLines(p => p.map((l, i) => i === idx ? { ...l, returnQuantity: qty } : l))
  }

  const validLines = lines.filter(l => parseFloat(l.returnQuantity) > 0)
  const totalAmount = validLines.reduce((sum, l) => sum + (parseFloat(l.returnQuantity) * l.unitCost), 0)

  const handleSubmit = async () => {
    if (selectedPOId === 'none') {
      toast.error('Select a Purchase Order')
      return
    }
    if (!reason) {
      toast.error('Return reason is required')
      return
    }
    if (validLines.length === 0) {
      toast.error('Enter return quantities for at least one item')
      return
    }

    setLoading(true)
    try {
      await createPurchaseReturn({
        purchaseOrderId: parseInt(selectedPOId),
        agentId: selectedAgentId !== 'none' ? parseInt(selectedAgentId) : undefined,
        reason,
        notes,
        items: validLines.map(l => ({
          itemId: l.poItemId,
          quantity: parseFloat(l.returnQuantity),
          unitCost: l.unitCost
        }))
      })

      toast.success('Return Created', { description: 'The return request has been submitted for approval.' })
      setOpen(false)
      reset()
      router.refresh()
    } catch (err: any) {
      toast.error('Failed to create return', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <button className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-3 sm:px-5 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 min-w-0 shrink',
          triggerClassName
        )} />
      }>
        <Undo2 size={16} className="shrink-0" />
        <span className="truncate text-center leading-tight">Create Return</span>
      </DialogTrigger>

      <DialogContent className="w-full max-w-2xl p-0 border-none shadow-2xl rounded-2xl overflow-hidden font-sans">
        <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Undo2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <DialogTitle className="text-xl font-black text-gray-900 dark:text-white">Purchase Return</DialogTitle>
            <p className="text-sm font-semibold text-gray-400">Return items to supplier and log a credit note.</p>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Supplier</Label>
              <select
                value={selectedAgentId}
                onChange={e => { setSelectedAgentId(e.target.value); setSelectedPOId('none') }}
                className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-bold outline-none"
              >
                <option value="none">No Supplier</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Purchase Order</Label>
              <select
                value={selectedPOId}
                onChange={e => setSelectedPOId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-bold outline-none"
                disabled={availablePOs.length === 0}
              >
                <option value="none">Select PO...</option>
                {availablePOs.map(po => (
                  <option key={po.id} value={po.id}>PO #{po.id} ({po.totalCost} SAR - {po.method})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Return Reason</Label>
            <div className="flex gap-2">
              {['Defective', 'Expired', 'Wrong Item', 'Other'].map(r => (
                <button
                  key={r} type="button"
                  onClick={() => setReason(r)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition border-2", reason === r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500')}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Other' && (
              <Input placeholder="Specify reason..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-2" />
            )}
          </div>

          {selectedPO && (
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-900">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Items to Return</Label>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{line.name}</p>
                      <p className="text-[10px] text-gray-400">Purchased: {line.maxQuantity} {line.unit} @ {line.unitCost} SAR</p>
                    </div>
                    <div className="w-24 shrink-0">
                      <Input
                        type="number" min="0" max={line.maxQuantity} step="0.1" placeholder="0"
                        value={line.returnQuantity}
                        onChange={e => updateLine(idx, e.target.value)}
                        className="h-9 text-right font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-900 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Refund Value</p>
            <p className="text-xl font-black text-indigo-600 tabular-nums">{totalAmount.toFixed(2)} SAR</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedPOId === 'none' || validLines.length === 0 || !reason}
            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm flex items-center gap-2 transition"
          >
            {loading ? 'Processing...' : 'Submit Return'} <ArrowRight size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
