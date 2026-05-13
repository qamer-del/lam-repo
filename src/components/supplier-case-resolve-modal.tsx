'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, AlertTriangle, DollarSign, Package, Wrench, RefreshCw, XCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { resolveSupplierCase, markSupplierCaseSent } from '@/actions/warranty'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Resolution = 'REPLACED' | 'REPAIRED' | 'REFUNDED' | 'REJECTED'

interface CaseItem {
  id: number
  itemId: number
  quantity: number
  item: { name: string; sku?: string | null; unit: string }
  resolutionType?: string | null
}

interface SupplierCase {
  id: number
  referenceNumber?: string | null
  status: string
  notes?: string | null
  agent?: { name: string; companyName?: string | null } | null
  items: CaseItem[]
}

interface Props {
  supplierCase: SupplierCase
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const resolutions: { value: Resolution; label: string; desc: string; color: string; icon: any }[] = [
  {
    value: 'REPLACED',
    label: 'Replaced',
    desc: 'Supplier sent new items — add back to stock',
    color: 'emerald',
    icon: RefreshCw,
  },
  {
    value: 'REPAIRED',
    label: 'Repaired',
    desc: 'Items repaired and returned — add back to stock',
    color: 'blue',
    icon: Wrench,
  },
  {
    value: 'REFUNDED',
    label: 'Refunded',
    desc: 'Supplier issued monetary refund — creates financial transaction',
    color: 'violet',
    icon: DollarSign,
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    desc: 'Supplier rejected claim — items moved to Damaged stock',
    color: 'red',
    icon: XCircle,
  },
]

const colorMap: Record<string, string> = {
  emerald: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700',
  blue: 'border-blue-300 bg-blue-50 dark:bg-blue-900/10 text-blue-700',
  violet: 'border-violet-300 bg-violet-50 dark:bg-violet-900/10 text-violet-700',
  red: 'border-red-300 bg-red-50 dark:bg-red-900/10 text-red-700',
}

export function SupplierCaseResolveModal({ supplierCase, open, onOpenChange, onSuccess }: Props) {
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [markingSent, setMarkingSent] = useState(false)

  const handleMarkSent = async () => {
    setMarkingSent(true)
    try {
      await markSupplierCaseSent(supplierCase.id, supplierCase.referenceNumber || undefined)
      toast.success('Case marked as Sent to Supplier')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error('Failed', { description: err.message || String(err) })
    } finally {
      setMarkingSent(false)
    }
  }

  const handleResolve = async () => {
    if (!resolution) {
      toast.warning('Please select a resolution type')
      return
    }
    if (resolution === 'REFUNDED' && (!refundAmount || Number(refundAmount) <= 0)) {
      toast.warning('Enter the refund amount from the supplier')
      return
    }
    setSaving(true)
    try {
      await resolveSupplierCase({
        caseId: supplierCase.id,
        resolution,
        notes: notes.trim() || undefined,
        refundAmount: resolution === 'REFUNDED' ? Number(refundAmount) : undefined,
      })
      toast.success(`Case Resolved: ${resolution}`, {
        description: resolution === 'REFUNDED'
          ? `Financial transaction of SAR ${refundAmount} created.`
          : resolution === 'REJECTED'
          ? 'Items moved to Damaged stock.'
          : 'Items returned to available stock.',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error('Failed to resolve', { description: err.message || String(err) })
    } finally {
      setSaving(false)
    }
  }

  const isPending = supplierCase.status === 'PENDING'
  const isSent = supplierCase.status === 'SENT_TO_SUPPLIER'
  const isClosed = !['PENDING', 'SENT_TO_SUPPLIER'].includes(supplierCase.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-950 max-h-[92vh] overflow-y-auto">
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-amber-500" />

        <div className="p-7 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
              Supplier Case #{supplierCase.id}
              {supplierCase.agent && (
                <span className="block text-sm font-bold text-gray-400 mt-1">{supplierCase.agent.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Case Items Summary */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Items in Case</p>
            <div className="space-y-1.5">
              {supplierCase.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <Package size={14} className="text-orange-500 shrink-0" />
                  <span className="flex-1 font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{item.item.name}</span>
                  <span className="text-xs font-black text-orange-600">{item.quantity} {item.item.unit}</span>
                  {item.resolutionType && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">{item.resolutionType}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mark as sent — only if PENDING */}
          {isPending && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Step 1: Mark as Sent</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Once you physically ship these items to the supplier, mark the case as sent.
              </p>
              <Button
                onClick={handleMarkSent}
                disabled={markingSent}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl h-10 px-5"
              >
                {markingSent ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Mark as Sent to Supplier
              </Button>
            </div>
          )}

          {/* Resolution — only if SENT_TO_SUPPLIER */}
          {isSent && (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step 2: Record Supplier Response</p>

              <div className="grid grid-cols-2 gap-2">
                {resolutions.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setResolution(r.value)}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left transition-all',
                      resolution === r.value
                        ? colorMap[r.color] + ' border-current'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-gray-300'
                    )}
                  >
                    <r.icon size={16} className="mb-2" />
                    <p className="font-black text-sm">{r.label}</p>
                    <p className="text-[10px] font-medium text-gray-500 mt-1 leading-snug">{r.desc}</p>
                  </button>
                ))}
              </div>

              {resolution === 'REFUNDED' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Refund Amount (SAR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    className="h-12 rounded-2xl border-2 border-violet-200 bg-violet-50 dark:bg-violet-900/10 focus:border-violet-500 font-black px-5 text-lg"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resolution Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Supplier RMA approved, items replaced with new batch"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="h-12 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-900 focus:border-orange-500 font-medium px-5"
                />
              </div>

              {resolution && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">What will happen</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    {resolution === 'REPLACED' && '→ All items added back to available stock.'}
                    {resolution === 'REPAIRED' && '→ All items added back to available stock.'}
                    {resolution === 'REFUNDED' && `→ Items removed from return pool. Financial transaction of SAR ${refundAmount || '0'} created.`}
                    {resolution === 'REJECTED' && '→ Items moved to Damaged stock. No financial transaction.'}
                  </p>
                </div>
              )}

              <Button
                onClick={handleResolve}
                disabled={saving || !resolution}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-widest shadow-lg disabled:opacity-40"
              >
                {saving
                  ? <><Loader2 size={16} className="animate-spin mr-2" /> Resolving...</>
                  : <><CheckCircle size={16} className="mr-2" /> Confirm Resolution</>
                }
              </Button>
            </div>
          )}

          {/* Closed case display */}
          {isClosed && (
            <div className="p-5 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 text-center">
              <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-700 dark:text-green-400">Case Resolved</p>
              <p className="text-xs text-green-600 mt-1 font-medium">Status: {supplierCase.status}</p>
              {supplierCase.notes && (
                <p className="text-xs text-gray-500 mt-2 italic">"{supplierCase.notes}"</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
