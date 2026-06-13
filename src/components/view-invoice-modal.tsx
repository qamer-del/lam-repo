'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getInvoiceDetails, getPaymentCorrectionsForInvoice } from '@/actions/transactions'
import { checkWarrantyStatus } from '@/actions/warranty'
import { ModernLoader } from './ui/modern-loader'
import { format } from 'date-fns'
import { Receipt, Package, ShieldCheck, ShieldOff, ShieldAlert, Download, Printer, RefreshCw, History } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { InvoiceDocument } from './invoice-document'
import { useLanguage } from '@/providers/language-provider'
import { usePrinter } from '@/providers/printer-provider'
import { calcVat15, generateZatcaQrDataUrl } from '@/lib/zatca-qr'
import { PaymentMethodCorrectionModal } from './payment-method-correction-modal'
import { useSession } from 'next-auth/react'

export function ViewInvoiceModal({ 
  invoiceNumber, 
  open, 
  onOpenChange,
  userRole, // fallback if passed manually
}: { 
  invoiceNumber: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole?: string
}) {
  const { data: session } = useSession();
  const { locale } = useLanguage();
  const { print: printThermal, status: printerStatus, isPrinting } = usePrinter()
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<any>(null)
  const [warranties, setWarranties] = useState<any[]>([])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [corrections, setCorrections] = useState<any[]>([])
  const [correctionOpen, setCorrectionOpen] = useState(false)

  const activeRole = userRole || session?.user?.role;
  const isAdmin = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN'

  const loadDetails = useCallback(() => {
    if (!invoiceNumber) return
    setLoading(true)
    Promise.all([
      getInvoiceDetails(invoiceNumber),
      checkWarrantyStatus({ invoiceNumber }),
      getPaymentCorrectionsForInvoice(invoiceNumber),
    ])
      .then(([res, warRes, corrRes]) => {
        setDetails(res)
        setWarranties(warRes)
        setCorrections(corrRes)
        setLoading(false)
        if (res) {
          const { vat } = calcVat15(res.totalAmount)
          generateZatcaQrDataUrl({
            sellerName: 'LAMAHA Car Care Center',
            vatNumber: '300000000000000',
            invoiceDate: new Date(res.createdAt),
            totalWithVat: res.totalAmount,
            vatAmount: vat,
          }).then(setQrDataUrl)
        }
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [invoiceNumber])

  useEffect(() => {
    if (open && invoiceNumber) {
      loadDetails()
    } else {
      setDetails(null)
      setWarranties([])
      setCorrections([])
    }
  }, [open, invoiceNumber, loadDetails])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:w-full sm:max-w-[480px] p-0 border-none shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] bg-white dark:bg-gray-950 scrollbar-hide">
        <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 sticky top-0 z-10" />
        
        <div className="p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
              <DialogTitle className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl sm:rounded-2xl shadow-inner shrink-0">
                  <Receipt size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="leading-tight">Invoice Details</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Digital Receipt</span>
                </div>
              </DialogTitle>
              {details && (
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                  {/* Correct Payment Method — Admin only */}
                  {isAdmin && (
                    <button
                      onClick={() => setCorrectionOpen(true)}
                      className="col-span-1 sm:flex-none justify-center flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs uppercase tracking-widest transition-colors border border-indigo-100"
                    >
                      <RefreshCw size={14} />
                      <span>Correct</span>
                    </button>
                  )}
                  {/* Thermal Reprint — only shown when QZ Tray is connected */}
                  {printerStatus === 'connected' && (
                    <button
                      disabled={isPrinting}
                      onClick={() => {
                        printThermal({
                          invoiceNumber: details.invoiceNumber,
                          createdAt: new Date(details.createdAt),
                          cashierName: details.salesperson || 'Cashier',
                          items: (details.items || []).map((item: any) => ({
                            name: item.name,
                            quantity: item.quantitySold,
                            unit: item.unit,
                          })),
                          totalAmount: details.totalAmount,
                          paymentMethod: details.transactions?.[0]?.method || 'CASH',
                        })
                      }}
                      className="col-span-1 sm:flex-none justify-center flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      <Printer size={16} />
                      <span>{isPrinting ? 'Print' : 'Reprint'}</span>
                    </button>
                  )}
                  {/* Save PDF */}
                  <PDFDownloadLink
                    document={<InvoiceDocument details={details} warranties={warranties} locale={locale} qrDataUrl={qrDataUrl} />}
                    fileName={`invoice-${details.invoiceNumber}.pdf`}
                    className="col-span-2 sm:flex-none justify-center flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs uppercase tracking-widest transition-colors"
                  >
                    <Download size={16} />
                    <span>Save PDF</span>
                  </PDFDownloadLink>
                </div>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 animate-pulse">Loading Receipt</p>
            </div>
          ) : details ? (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-5 bg-gray-50 dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 sm:mb-2">Invoice #</p>
                  <p className="font-mono text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">{details.invoiceNumber}</p>
                </div>
                <div className="p-3 sm:p-5 bg-gray-50 dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 sm:mb-2">Issued On</p>
                  <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                    {format(new Date(details.createdAt), 'MMM dd, yyyy')}<br/>
                    <span className="text-[10px] opacity-50">{format(new Date(details.createdAt), 'hh:mm a')}</span>
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 sm:p-5 bg-gray-50 dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 sm:mb-2">Cashier</p>
                  <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                    {details.salesperson}
                  </p>
                </div>
              </div>

              {/* Total Section — ZATCA tax breakdown */}
              {(() => {
                const { base: subtotal, vat } = calcVat15(details.totalAmount)
                return (
                  <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-slate-900 text-white shadow-xl shadow-slate-900/20">
                    {/* Tax summary strip */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-4 px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-white/10">
                      <div className="text-center sm:text-left">
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Subtotal (excl. VAT)</p>
                        <p className="text-sm sm:text-base font-black tabular-nums text-slate-200">{subtotal.toFixed(2)} <span className="text-[10px] sm:text-xs opacity-60">SAR</span></p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">VAT (15%)</p>
                        <p className="text-sm sm:text-base font-black tabular-nums text-amber-400">{vat.toFixed(2)} <span className="text-[10px] sm:text-xs opacity-60">SAR</span></p>
                      </div>
                      <div className="text-center col-span-2 sm:col-span-1 border-t border-white/10 sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0 sm:text-right">
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Total incl. VAT</p>
                        <p className="text-xl sm:text-2xl font-black tabular-nums text-emerald-400">{details.totalAmount.toFixed(2)} <span className="text-xs sm:text-sm opacity-70">SAR</span></p>
                      </div>
                    </div>
                    {/* Payment method + ZATCA note */}
                    <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4">
                      <div className="flex gap-2 flex-wrap">
                        {details.transactions.map((t: any) => (
                          <span key={t.id} className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
                            {t.method}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-500 text-right">
                        Tax Invoice<br/>
                        فاتورة ضريبية مبسطة
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* Items Table */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Package size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                  <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Purchased Items</h3>
                </div>
                
                {details.items && details.items.length > 0 ? (
                  <div className="space-y-2.5 sm:space-y-3">
                    {details.items.map((item: any, i: number) => (
                      <div key={i} className="group flex justify-between items-center p-3 sm:p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl sm:rounded-2xl hover:border-emerald-200 transition-all shadow-sm">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-[10px] sm:text-xs font-black text-gray-400 group-hover:text-emerald-500 transition-colors shrink-0">
                            {i + 1}
                          </div>
                          <div className="min-w-0 pr-2">
                            <p className="font-black text-sm sm:text-base text-gray-900 dark:text-white leading-tight truncate">{item.name}</p>
                            {item.sku && <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono mt-0.5 truncate">{item.sku}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white tabular-nums">{item.quantitySold}</p>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider">{item.unit}</p>
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
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <ShieldCheck size={14} className="text-violet-500 sm:w-4 sm:h-4" />
                    <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-violet-500">Warranty Coverage</h3>
                  </div>
                  <div className="space-y-2">
                    {warranties.map((w: any) => {
                      const isActive = w.status === 'ACTIVE'
                      const isExpired = w.status === 'EXPIRED'
                      const Icon = isActive ? ShieldCheck : isExpired ? ShieldOff : ShieldAlert
                      return (
                        <div key={w.id} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${
                          isActive ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                          isExpired ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                          'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        }`}>
                          <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 ${
                            isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                            isExpired ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                          }`}>
                            <Icon size={14} className={`sm:w-4 sm:h-4 ${isActive ? 'text-emerald-600' : isExpired ? 'text-red-500' : 'text-amber-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs sm:text-sm text-gray-900 dark:text-white truncate">{w.item?.name}</p>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">
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
                <div className="p-4 sm:p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl sm:rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1.5 sm:mb-2">Notes</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 italic">"{details.description}"</p>
                </div>
              )}

              {/* ── Payment Method Correction History ── */}
              {corrections.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <History size={14} className="text-indigo-500" />
                    <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-500">Payment Method Corrections</h3>
                  </div>
                  <div className="space-y-2">
                    {corrections.map((c: any) => (
                      <div key={c.id} className="p-3 sm:p-4 bg-indigo-50/60 rounded-xl sm:rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">{c.oldMethod}</span>
                          <RefreshCw size={11} className="text-indigo-400" />
                          <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">{c.newMethod}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium text-gray-600 italic mb-1 sm:mb-1.5">"{c.reason}"</p>
                        <p className="text-[9px] sm:text-[10px] text-gray-400">
                          By <span className="font-bold text-gray-600">{c.correctedBy?.name}</span> · {format(new Date(c.createdAt), 'MMM d, yyyy · h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
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

    {/* Correction modal — mounted outside the invoice dialog to avoid nesting issues */}
    {details && correctionOpen && (
      <PaymentMethodCorrectionModal
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        invoiceNumber={details.invoiceNumber}
        currentMethod={details.transactions?.[0]?.method || 'CASH'}
        onCorrected={loadDetails}
      />
    )}
    </>
  )
}
