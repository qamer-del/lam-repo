'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'
import { createSettlement } from '@/actions/transactions'
import { pdf } from '@react-pdf/renderer'
import { SettlementDocument } from './settlement-document'
import { useStore } from '@/store/useStore'

import { cn } from '@/lib/utils'

export function SettleCashBtn({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const { transactions } = useStore()

  const handleSettle = async () => {
    setLoading(true)
    try {
      const unsettledTxs = transactions.filter(tx => !tx.isSettled)
      const settlement = await createSettlement()
      
      const blob = await pdf(<SettlementDocument settlement={settlement} transactions={unsettledTxs} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `settlement-${settlement.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      window.location.reload()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="secondary" 
      className={cn("bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-500/20 transition-all active:scale-95", triggerClassName)} 
      onClick={handleSettle} 
      disabled={loading}
    >
      {loading ? '...' : t('settleCash')}
    </Button>
  )
}
