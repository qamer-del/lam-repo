'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getInvoiceDetails } from '@/actions/transactions'
import { checkWarrantyStatus } from '@/actions/warranty'
import { ModernLoader } from './ui/modern-loader'
import { format } from 'date-fns'
import { Receipt, Package, ShieldCheck, ShieldOff, ShieldAlert, Download } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { InvoiceDocument } from './invoice-document'

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
  const [warranties, setWarranties] = useState<any[]>([])

  useEffect(() => {
    if (open && invoiceNumber) {
      setLoading(true)
      Promise.all([
        getInvoiceDetails(invoiceNumber),
        checkWarrantyStatus({ invoiceNumber }),
      ])
        .then(([res, warRes]) => {
          setDetails(res)
          setWarranties(warRes)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    } else {
      setDetails(null)
      setWarranties([])
    }
  }, [open, invoiceNumber])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-950">
        <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
        
        <div className="p-8 md:p-10 space-y-8">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner">
                  <Receipt size={28} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="leading-tight">Invoice Details</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Digital Receipt</span>
                </div>
              </DialogTitle>
              {details && (
                <PDFDownloadLink
                  document={<InvoiceDocument details={details} warranties={warranties} />}
                  fileName={`invoice-${details.invoiceNumber}.pdf`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Save PDF</span>
                </PDFDownloadLink>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 animate-pulse">Loading Receipt</p>
            </div>
          ) : details ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Invoice #</p>
                  <p className="font-mono text-xs sm:text-sm font-black text-gray-900 dark:text-white">{details.invoiceNumber}</p>
                </div>
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Issued On</p>
                  <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                    {format(new Date(details.createdAt), 'MMM dd, yyyy')}<br/>
                    <span className="text-[10px] opacity-50">{format(new Date(details.createdAt), 'hh:mm a')}</span>
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Cashier</p>
                  <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                    {details.salesperson}
                  </p>
                </div>
              </div>

              {/* Total Section */}
              <div className="relative overflow-hidden p-8 rounded-[2rem] bg-emerald-600 text-white shadow-xl shadow-emerald-600/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-2">Grand Total</p>
                    <p className="text-5xl font-black tabular-nums tracking-tighter">
                      {details.totalAmount.toFixed(2)}
                      <span className="text-lg ml-2 opacity-80 italic">SAR</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-2">Method</p>
                    <div className="flex gap-2 justify-end flex-wrap">
                      {details.transactions.map((t: any) => (
                        <span key={t.id} className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
                          {t.method}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Package size={16} className="text-gray-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Purchased Items</h3>
                </div>
                
                {details.items && details.items.length > 0 ? (
                  <div className="space-y-3">
                    {details.items.map((item: any, i: number) => (
                      <div key={i} className="group flex justify-between items-center p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-emerald-200 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-xs font-black text-gray-400 group-hover:text-emerald-500 transition-colors">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white leading-tight">{item.name}</p>
                            {item.sku && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{item.quantitySold}</p>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{item.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-10 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-bold text-gray-400">No items found.</p>
                  </div>
                )}
              </div>

              {/* Warranty Section */}
              {warranties.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <ShieldCheck size={16} className="text-violet-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-violet-500">Warranty Coverage</h3>
                  </div>
                  <div className="space-y-2">
                    {warranties.map((w: any) => {
                      const isActive = w.status === 'ACTIVE'
                      const isExpired = w.status === 'EXPIRED'
                      const Icon = isActive ? ShieldCheck : isExpired ? ShieldOff : ShieldAlert
                      return (
                        <div key={w.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${
                          isActive ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                          isExpired ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                          'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        }`}>
                          <div className={`p-2 rounded-xl ${
                            isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                            isExpired ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                          }`}>
                            <Icon size={16} className={isActive ? 'text-emerald-600' : isExpired ? 'text-red-500' : 'text-amber-600'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-gray-900 dark:text-white truncate">{w.item?.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              Replacement · {w.item?.warrantyDuration} {w.item?.warrantyUnit} · expires{' '}
                              <span className="font-bold">{format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}</span>
                            </p>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            isActive ? 'bg-emerald-500 text-white' :
                            isExpired ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {details.description && (
                <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Notes</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 italic">"{details.description}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Receipt size={32} />
              </div>
              <p className="text-sm font-bold text-gray-500">Invoice not found.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
