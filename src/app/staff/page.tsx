'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/providers/language-provider'
import { StaffLedger } from '@/components/staff-ledger'
import { AddStaffModal } from '@/components/add-staff-modal'
import { getStaffList } from '@/actions/staff'
import { getDashboardData } from '@/actions/transactions'

type Staff = {
  id: number
  name: string
  baseSalary: number
  isActive: boolean
}

type Transaction = {
  id: number
  type: string
  amount: number
  fundAmount: number
  method: string
  description: string | null
  isSettled: boolean
  staffId?: number | null
  createdAt: Date
}

export default function StaffPage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const [staff, setStaff] = useState<Staff[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [staffData, txData] = await Promise.all([
        getStaffList(),
        getDashboardData()
      ])
      setStaff(staffData as any)
      setTransactions(txData.transactions as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('staffLedger')}</h1>
        <AddStaffModal onAdded={loadData} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
          Loading...
        </div>
      ) : (
        <StaffLedger staff={staff} transactions={transactions} onEdited={loadData} />
      )}
    </div>
  )
}
