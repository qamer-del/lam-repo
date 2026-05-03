'use client'

import { useState } from 'react'
import { ShieldCheck, Search, AlertTriangle, Loader2, FileText } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getWarrantiesByInvoice, processWarrantyClaim } from '@/actions/warranty'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED'

interface WarrantyRecord {
  id: number
  invoiceNumber: string
  saleDate: Date
  warrantyEndDate: Date
  status: WarrantyStatus
  claimedAt?: Date | null
  claimNotes?: string | null
  customerName?: string | null
  customerPhone?: string | null
  item: {
    id: number
    name: string
    sku?: string | null
    currentStock: number
    unit: string
    warrantyDuration?: number | null
    warrantyUnit?: string | null
  }
  customer?: { name: string; phone?: string | null } | null
}

interface Props {
  triggerClassName?: string
}

export function WarrantyClaimModal({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'search' | 'select' | 'confirm'>('search')
  const [invoiceInput, setInvoiceInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([])
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null)
  const [claimNotes, setClaimNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const reset = () => {
    setStep('search')
    setInvoiceInput('')
    setWarranties([])
    setSelectedWarranty(null)
    setClaimNotes('')
  }

  const handleSearch = async () => {
    if (!invoiceInput.trim()) return
    setSearching(true)
    try {
      const results = await getWarrantiesByInvoice(invoiceInput.trim())
      if (results.length === 0) {
        toast.warning('No warranties found', { description: `No warranty records found for invoice "${invoiceInput}".` })
        return
      }
      setWarranties(results as WarrantyRecord[])
      setStep('select')
    } catch (err) {
      toast.error('Search failed', { description: String(err) })
    } finally {
      setSearching(false)
    }
  }

  const handleClaim = async () => {
    if (!selectedWarranty) return
    setProcessing(true)
    try {
      await processWarrantyClaim({
        warrantyId: selectedWarranty.id,
        claimNotes: claimNotes.trim() || undefined,
      })
      toast.success('Replacement Processed', {
        description: `Warranty claim for "${selectedWarranty.item.name}" has been recorded. Stock has been updated.`,
      })
      reset()
      setOpen(false)
    } catch (err: any) {
      toast.error('Claim Failed', { description: err.message || String(err) })
    } finally {
      setProcessing(false)
    }
  }

  const activeWarranties = warranties.filter(w => w.status === 'ACTIVE')
  const nonActiveWarranties = warranties.filter(w => w.status !== 'ACTIVE')

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <Button className={cn(
          'flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all active:scale-95',
          triggerClassName
        )} />
      }>
        <ShieldCheck size={16} />
        Warranty Claim
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-950 max-h-[90vh] overflow-y-auto">
        <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

        <div className="p-7 space-y-7">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-2xl">
                <ShieldCheck size={28} className="text-violet-600" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight">Warranty Claim</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Replacement Only</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Invoice Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. INV-1714819200000"
                    value={invoiceInput}
                    onChange={e => setInvoiceInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="h-14 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-900 focus:border-violet-500 font-bold px-5 text-sm"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !invoiceInput.trim()}
                    className="h-14 px-5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-all flex items-center gap-2 font-black shrink-0"
                  >
                    {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 flex gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                  This process will <strong>replace the item</strong> and deduct stock. No cash refund will be issued.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Select warranty */}
          {step === 'select' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <FileText size={16} className="text-gray-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice</p>
                  <p className="font-mono font-black text-sm text-gray-900 dark:text-white">{invoiceInput}</p>
                </div>
                <button
                  onClick={() => setStep('search')}
                  className="ml-auto text-[10px] font-black uppercase tracking-widest text-violet-600 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Active warranties */}
              {activeWarranties.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Active Warranties</p>
                  {activeWarranties.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { setSelectedWarranty(w); setStep('confirm') }}
                      className="w-full text-left p-4 rounded-2xl border-2 border-transparent hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/10 bg-white dark:bg-gray-900 transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                          <ShieldCheck size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 dark:text-white text-sm truncate">{w.item.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            Valid until <span className="font-bold text-emerald-600">{format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</span>
                            {' · '} Stock: {w.item.currentStock} {w.item.unit}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-violet-500 group-hover:translate-x-1 transition-transform shrink-0">
                          Select →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Non-active warranties */}
              {nonActiveWarranties.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Ineligible</p>
                  {nonActiveWarranties.map(w => (
                    <div key={w.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                          <ShieldCheck size={18} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-black text-gray-500 text-sm">{w.item.name}</p>
                          <span className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                            w.status === 'EXPIRED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                          )}>
                            {w.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeWarranties.length === 0 && (
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <ShieldCheck size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="font-black text-gray-400">No active warranties on this invoice.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedWarranty && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Summary card */}
              <div className="p-5 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-200 dark:border-violet-800 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Replacement Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Item</span>
                    <span className="font-black text-gray-900 dark:text-white">{selectedWarranty.item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Quantity</span>
                    <span className="font-black text-emerald-600">1 {selectedWarranty.item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Invoice</span>
                    <span className="font-mono font-black text-gray-700 dark:text-gray-300">{selectedWarranty.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Warranty Expires</span>
                    <span className="font-black text-emerald-600">{format(new Date(selectedWarranty.warrantyEndDate), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Current Stock</span>
                    <span className={cn('font-black', selectedWarranty.item.currentStock < 1 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>
                      {selectedWarranty.item.currentStock} {selectedWarranty.item.unit}
                    </span>
                  </div>
                </div>
              </div>

              {selectedWarranty.item.currentStock < 1 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 flex gap-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 font-bold">Insufficient stock to process this replacement.</p>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Claim Notes (optional)</Label>
                <Input
                  placeholder="e.g. Product defect — manufacturing issue"
                  value={claimNotes}
                  onChange={e => setClaimNotes(e.target.value)}
                  className="h-12 rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-900 focus:border-violet-500 font-medium px-5"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  ⚠️ This will deduct 1 unit from stock and mark this warranty as <strong>Claimed</strong>. This cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-black text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleClaim}
                  disabled={processing || selectedWarranty.item.currentStock < 1}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {processing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><ShieldCheck size={16} /> Confirm Replacement</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
