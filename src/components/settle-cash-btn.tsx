'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { createSettlement } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'
import { useStore } from '@/store/useStore'

import { cn } from '@/lib/utils'

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettleCashBtn({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [actualCount, setActualCount] = useState<string>('')
  const { transactions, cashInDrawer } = useStore()

  const handleSettle = async () => {
    const count = parseFloat(actualCount)
    if (isNaN(count)) return;

    setLoading(true)
    try {
      const unsettledTxs = transactions.filter(tx => !tx.isSettled)
      const settlement = await createSettlement(count)
      
      if (settlement) {
        const blob = await pdf(<SettlementDocument settlement={settlement} transactions={unsettledTxs} />).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `settlement-${settlement.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setIsOpen(false)
      window.location.reload()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const diff = parseFloat(actualCount || '0') - cashInDrawer

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button 
            variant="secondary" 
            className={cn("bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-500/20 transition-all active:scale-95", triggerClassName)} 
            disabled={loading}
          />
        }
      >
        {t('settleCash')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finalize Cash Settlement</DialogTitle>
          <DialogDescription>
            Verify the physical cash in the drawer before handing it over to the owner.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
            <Label className="text-xs text-gray-400 uppercase font-bold tracking-wider">System Expected Cash</Label>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {cashInDrawer.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="actual-cash" className="font-bold">Physically Counted Cash</Label>
            <Input
              id="actual-cash"
              type="number"
              placeholder="0.00"
              value={actualCount}
              onChange={(e) => setActualCount(e.target.value)}
              className="text-lg font-bold h-12"
              autoFocus
            />
          </div>

          {actualCount && (
            <div className={`p-4 rounded-xl border flex justify-between items-center ${diff === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
              <span className="text-sm font-bold">Discrepancy:</span>
              <span className="text-lg font-black tabular-nums">
                {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl"
            onClick={handleSettle}
            disabled={loading || !actualCount}
          >
            {loading ? 'Processing...' : 'Confirm Handover & Settle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
