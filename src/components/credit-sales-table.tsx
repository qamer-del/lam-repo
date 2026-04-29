'use client'

import { useState } from 'react'
import { 
  Users, 
  Phone, 
  Banknote, 
  Wifi, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical
} from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { settleCreditSale } from '@/actions/transactions'
import { useRouter } from 'next/navigation'
import { ModernLoader } from './ui/modern-loader'

export function CreditSalesTable({ sales }: { sales: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any | null>(null)
  const [settleOpen, setSettleOpen] = useState(false)

  const unpaidSales = sales.filter(s => s.method === 'CREDIT' && !s.isSettled)

  const handleSettle = async (method: 'CASH' | 'NETWORK') => {
    if (!selectedSale) return
    setLoading(true)
    try {
      await settleCreditSale({
        transactionId: selectedSale.id,
        paymentMethod: method
      })
      setSettleOpen(false)
      setSelectedSale(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to settle credit sale')
    } finally {
      setLoading(false)
    }
  }

  if (unpaidSales.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-gray-50/50 dark:bg-gray-900/20">
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Users size={24} />
          </div>
          <p className="text-gray-500 font-medium">No outstanding credit sales</p>
          <p className="text-xs text-gray-400 mt-1">All customer debts are currently settled.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {loading && <ModernLoader />}
      
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-wider">Customer</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaidSales.map((sale) => (
                <TableRow key={sale.id} className="group hover:bg-amber-500/5 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {sale.customerName || 'Walk-in Customer'}
                        <Users size={12} className="text-amber-500" />
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {sale.customerPhone || 'No phone'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-gray-500 font-medium">
                      {format(new Date(sale.createdAt), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-black text-amber-600 tabular-nums">
                      {sale.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-none font-cairo">
                        <DropdownMenuItem 
                          onClick={() => { setSelectedSale(sale); setSettleOpen(true); }}
                          className="text-amber-600 font-bold focus:text-amber-700 focus:bg-amber-50 cursor-pointer gap-2"
                        >
                          <CheckCircle2 size={16} /> Collect Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-gray-500 gap-2 cursor-pointer">
                          <AlertCircle size={16} /> View Invoice
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl font-cairo">
          <div className="bg-amber-500 h-2 w-full" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                  <Banknote size={24} />
                </div>
                Collect Payment
              </DialogTitle>
            </DialogHeader>

            {selectedSale && (
              <div className="space-y-4">
                <div className="p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gray-400">Customer</span>
                    <span className="font-bold">{selectedSale.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-[10px] font-black uppercase text-gray-400">Total Due</span>
                    <span className="text-xl font-black text-amber-600">{selectedSale.amount.toFixed(2)} SAR</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSettle('CASH')}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-transparent bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-emerald-700 transition-all group"
                    >
                      <Banknote size={28} className="group-hover:scale-110 transition-transform" />
                      <span className="font-black text-xs uppercase">Cash Payment</span>
                    </button>
                    <button
                      onClick={() => handleSettle('NETWORK')}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-transparent bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/20 text-blue-700 transition-all group"
                    >
                      <Wifi size={28} className="group-hover:scale-110 transition-transform" />
                      <span className="font-black text-xs uppercase">Network Pay</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Button 
              variant="ghost" 
              onClick={() => setSettleOpen(false)}
              className="w-full text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-gray-600"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
