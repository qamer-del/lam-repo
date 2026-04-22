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
import { PdfReportButton } from './pdf-report-button'
import { editAdvance } from '@/actions/transactions'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [selected, setSelected] = useState<number | null>(null)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState<string>('')

  const handleEditSave = async (txId: number) => {
    try {
      await editAdvance(txId, parseFloat(editAmount))
      setEditingRow(null)
    } catch(e) {
      alert("Failed to edit advance. Ensure you are an admin.")
    }
  }

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

  const staffSummary = staff.map(s => {
    const sTxs = transactions.filter(tx => {
      const d = new Date(tx.createdAt)
      return tx.staffId === s.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    
    const advances = sTxs.filter(tx => tx.type === 'ADVANCE').reduce((sum, tx) => sum + tx.amount, 0)
    const deductions = sTxs.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + tx.amount, 0)
    const netSalary = s.baseSalary - advances - deductions

    return {
      ...s,
      advances,
      deductions,
      netSalary
    }
  })

  const totalBase = staffSummary.reduce((sum, s) => sum + s.baseSalary, 0)
  const totalAllAdvances = staffSummary.reduce((sum, s) => sum + s.advances, 0)
  const totalDeductions = staffSummary.reduce((sum, s) => sum + s.deductions, 0)
  const allNetSalary = staffSummary.reduce((sum, s) => sum + s.netSalary, 0)


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
        {!selected && (
          <PdfReportButton 
            staffSummary={staffSummary} 
            totals={{ base: totalBase, advances: totalAllAdvances, deductions: totalDeductions, net: allNetSalary }} 
          />
        )}
      </div>

      {selected && selectedStaff && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">{t('staffMembers')}</p>
              <p className="text-xl sm:text-2xl font-bold break-words">{selectedStaff.name}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Base Salary</p>
              <p className="text-xl sm:text-2xl font-bold">{selectedStaff.baseSalary.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Net this Month</p>
              <p className={`text-xl sm:text-2xl font-bold ${netSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {netSalary.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl dark:border-gray-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead className="whitespace-nowrap">#</TableHead>
                  <TableHead className="whitespace-nowrap">{t('amount')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('description')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('reportDate')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('settled')}</TableHead>
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
                      <TableCell className="font-semibold text-orange-600 whitespace-nowrap">
                        {editingRow === tx.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              className="w-20 p-1 border rounded text-sm" 
                              value={editAmount} 
                              onChange={e => setEditAmount(e.target.value)} 
                            />
                            <button onClick={() => handleEditSave(tx.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save</button>
                            <button onClick={() => setEditingRow(null)} className="text-xs bg-gray-200 px-2 py-1 rounded">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {tx.amount.toFixed(2)}
                            {isSuperAdmin && (
                              <button 
                                onClick={() => { setEditingRow(tx.id); setEditAmount(tx.amount.toString()); }}
                                className="text-xs text-blue-500 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.description || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(tx.createdAt), 'PPp')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${tx.isSettled ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                          {tx.isSettled ? t('settled') : t('unsettled')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!selected && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Base Salaries</p>
              <p className="text-xl sm:text-2xl font-bold">{totalBase.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Advances</p>
              <p className="text-xl sm:text-2xl font-bold">{totalAllAdvances.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Deductions</p>
              <p className="text-xl sm:text-2xl font-bold">{totalDeductions.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Total Net Salaries</p>
              <p className={`text-xl sm:text-2xl font-bold ${allNetSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {allNetSalary.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl dark:border-gray-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead className="whitespace-nowrap">{t('staffMembers')}</TableHead>
                  <TableHead className="whitespace-nowrap">Base Salary</TableHead>
                  <TableHead className="whitespace-nowrap">Advances</TableHead>
                  <TableHead className="whitespace-nowrap">Deductions</TableHead>
                  <TableHead className="whitespace-nowrap">Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffSummary.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.baseSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-orange-600 whitespace-nowrap">{s.advances.toFixed(2)}</TableCell>
                      <TableCell className="text-red-600 whitespace-nowrap">{s.deductions.toFixed(2)}</TableCell>
                      <TableCell className={`font-semibold whitespace-nowrap ${s.netSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {s.netSalary.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
