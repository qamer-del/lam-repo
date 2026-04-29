'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getInvoiceDetails } from '@/actions/transactions'
import { ModernLoader } from './ui/modern-loader'
import { format } from 'date-fns'
import { Receipt, Package } from 'lucide-react'

export function ViewInvoiceModal({ 
  invoiceNumber, 
  open, 
  onOpenChange 
}: { 
  invoiceNumber: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    if (open && invoiceNumber) {
      setLoading(true)
      getInvoiceDetails(invoiceNumber)
        .then(res => {
          setDetails(res)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    } else {
      setDetails(null)
    }
  }, [open, invoiceNumber])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Receipt size={18} />
            Invoice Details
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-10 flex justify-center"><ModernLoader /></div>
        ) : details ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Invoice Number</p>
                <p className="font-mono text-sm font-bold text-gray-900">{details.invoiceNumber}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Date</p>
                <p className="text-sm font-bold text-gray-900">{format(new Date(details.createdAt), 'PPp')}</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Amount</p>
                <p className="text-2xl font-black text-emerald-700 tabular-nums">{details.totalAmount.toFixed(2)} SAR</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Methods</p>
                <div className="flex gap-1 justify-end flex-wrap">
                  {details.transactions.map((t: any) => (
                    <span key={t.id} className="text-xs font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md">
                      {t.method} ({t.amount.toFixed(2)})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {details.description && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Description / Notes</p>
                <p className="text-sm text-gray-700">{details.description}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package size={15} className="text-gray-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">Items Included</h3>
              </div>
              {details.items && details.items.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {details.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        {item.sku && <p className="text-xs text-gray-500 font-mono">{item.sku}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{item.quantitySold} <span className="text-xs font-normal text-gray-500">{item.unit}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <p className="text-sm text-gray-500">No items recorded for this invoice.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            Invoice details not found or not a sales invoice.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
