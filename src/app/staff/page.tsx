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
      setTransactions(txData.allStaffTransactions as any)
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
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-400 dark:from-white dark:to-gray-500">
            {t('staffLedger')}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">Manage employee records, advances, and monthly settlements</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {session?.user?.role !== 'OWNER' && <AddStaffModal onAdded={loadData} />}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-in fade-in duration-1000">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-gray-800" />
            <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-gray-400 font-black tracking-widest uppercase text-[10px]">Please Wait</p>
            <p className="text-gray-900 dark:text-white font-bold">Synchronizing Ledger Data...</p>
          </div>
        </div>
      ) : (
        <StaffLedger staff={staff} transactions={transactions} onRefresh={loadData} />
      )}
    </div>
  )
}
