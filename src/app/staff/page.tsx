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
  const [loading, setLoading] = useState(false)

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
    // Only load once the session status is resolved — 'loading' means NextAuth
    // is still hydrating; we must wait for 'authenticated' or 'unauthenticated'
    if (status === 'authenticated') {
      loadData()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
    // Do nothing while status === 'loading' (NextAuth hydrating)
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

      {/* Show skeleton while NextAuth session is resolving OR data is loading */}
      {(status === 'loading' || loading) ? (
        <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading staff ledger...">
          {/* Tab bar skeleton */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl w-full overflow-hidden">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-9 rounded-xl bg-gray-200 dark:bg-gray-800" style={{ width: `${60 + i * 12}px`, flexShrink: 0 }} />
            ))}
          </div>
          {/* Summary cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-2/3 mx-auto" />
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full w-1/2 mx-auto" />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="h-14 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50" />
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 dark:border-gray-800/50">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-1/4" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-1/6" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-1/6" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-1/5 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <StaffLedger staff={staff} transactions={transactions} onRefresh={loadData} />
      )}
    </div>
  )
}
