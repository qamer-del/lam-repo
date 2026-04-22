'use client'

import { useState } from 'react'
import { Wallet, CheckCircle2, Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useLanguage } from '@/providers/language-provider'
import { settleSalary } from '@/actions/transactions'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { SalarySettlementDocument } from './salary-settlement-pdf'

export function SalarySettlementModal({ 
  staff, 
  advances, 
  totalAdvances, 
  netPaid 
}: { 
  staff: { id: number, name: string, baseSalary: number },
  advances: any[],
  totalAdvances: number,
  netPaid: number
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<'CASH' | 'NETWORK'>('CASH')
  const [settledData, setSettledData] = useState<any>(null)

  const handleSettle = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const res = await settleSalary({
        staffId: staff.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        method
      })
      setSettledData(res)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Settlement failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <ModernLoader />}
      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setSettledData(null); }}>
        <DialogTrigger render={<Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-500/20" />}>
          <Wallet size={16} />
          Settle Salary
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px]">
          {!settledData ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="text-emerald-500" />
                  Salary Settlement: {staff.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-6 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    This will mark all current advances as <strong>settled</strong> and record a final payout transaction. This action cannot be undone.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Base Salary</span>
                    <span className="font-bold">{staff.baseSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Advances Deducted</span>
                    <span className="font-bold text-red-500">- {totalAdvances.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between">
                    <span className="text-emerald-600 font-black uppercase text-xs">Net Payout Today</span>
                    <span className="text-xl font-black text-emerald-600">{netPaid.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Payment Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="w-full py-6 rounded-xl border-gray-200 focus:ring-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash Payment (Drawer)</SelectItem>
                      <SelectItem value="NETWORK">Network / Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSettle} className="w-full py-6 mt-4 bg-emerald-600 hover:bg-emerald-700 font-bold text-lg rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                  Confirm & Clear Balance
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Settlement Successful!</h3>
                <p className="text-sm text-gray-500 mt-2">Salary balance for {staff.name} has been reset.</p>
              </div>

              <div className="flex flex-col gap-3">
                <PDFDownloadLink
                  document={
                    <SalarySettlementDocument 
                      staffName={staff.name}
                      month={settledData.month}
                      year={settledData.year}
                      baseSalary={settledData.baseSalary}
                      advances={advances}
                      totalAdvances={settledData.advancesTally}
                      netPaid={settledData.netPaid}
                      paymentMethod={settledData.method}
                    />
                  }
                  fileName={`Settlement_${staff.name}_${settledData.month}_${settledData.year}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button variant="outline" disabled={pdfLoading} className="w-full py-6 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <Download size={18} />
                      {pdfLoading ? 'Preparing PDF...' : 'Download Settlement Advice'}
                    </Button>
                  )}
                </PDFDownloadLink>
                
                <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 text-xs">
                  Close Window
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
