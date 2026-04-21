'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLanguage } from '@/providers/language-provider'
import { format } from 'date-fns'

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
  createdAt: Date
  staffId?: number | null
  staff?: Staff | null
}

interface StaffLedgerProps {
  staff: Staff[]
  transactions: Transaction[]
}

export function StaffLedger({ staff, transactions }: StaffLedgerProps) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<number | null>(null)

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const staffTxs = transactions.filter(
    tx => tx.staffId !== undefined && tx.staffId === selected && tx.type === 'ADVANCE'
  )

  const totalAdvances = staffTxs.reduce((sum, tx) => {
    const d = new Date(tx.createdAt)
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return sum + tx.amount
    }
    return sum
  }, 0)

  const selectedStaff = staff.find(s => s.id === selected)
  const netSalary = selectedStaff ? selectedStaff.baseSalary - totalAdvances : 0

  const allAdvancesThisMonth = transactions.filter(tx => {
    const d = new Date(tx.createdAt)
    return tx.type === 'ADVANCE' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const totalAllAdvances = allAdvancesThisMonth.reduce((sum, tx) => sum + tx.amount, 0)
  const totalSalaries = staff.reduce((sum, s) => sum + s.baseSalary, 0)
  const allNetSalary = totalSalaries - totalAllAdvances

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelected(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected === null
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Overview Report
        </button>
        {staff.map(s => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selected === s.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {selected && selectedStaff && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">{t('staffMembers')}</p>
              <p className="text-2xl font-bold">{selectedStaff.name}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Base Salary</p>
              <p className="text-2xl font-bold">{selectedStaff.baseSalary.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Net this Month</p>
              <p className={`text-2xl font-bold ${netSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {netSalary.toFixed(2)}
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('reportDate')}</TableHead>
                <TableHead>{t('settled')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffTxs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                    No advances this month.
                  </TableCell>
                </TableRow>
              ) : (
                staffTxs.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.id}</TableCell>
                    <TableCell className="font-semibold text-orange-600">{tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{tx.description || '-'}</TableCell>
                    <TableCell>{format(new Date(tx.createdAt), 'PPp')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${tx.isSettled ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                        {tx.isSettled ? t('settled') : t('unsettled')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!selected && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Base Salaries</p>
              <p className="text-2xl font-bold">{totalSalaries.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Advances (This Month)</p>
              <p className="text-2xl font-bold">{totalAllAdvances.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Net Remaining Salaries</p>
              <p className={`text-2xl font-bold ${allNetSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {allNetSalary.toFixed(2)}
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('staffMembers')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('reportDate')}</TableHead>
                <TableHead>{t('settled')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAdvancesThisMonth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                    No advances issued to any employee this month.
                  </TableCell>
                </TableRow>
              ) : (
                allAdvancesThisMonth.map(tx => {
                  const employee = staff.find(s => s.id === tx.staffId)
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{employee ? employee.name : 'Unknown'}</TableCell>
                      <TableCell className="font-semibold text-orange-600">{tx.amount.toFixed(2)}</TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell>{format(new Date(tx.createdAt), 'PPp')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${tx.isSettled ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                          {tx.isSettled ? t('settled') : t('unsettled')}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
