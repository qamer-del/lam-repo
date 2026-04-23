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
import { Card, CardContent } from '@/components/ui/card'
import { User, DollarSign, Calendar, CheckCircle2, AlertCircle, Wallet, Landmark } from 'lucide-react'
import { SalarySettlementModal } from './salary-settlement-modal'
import { SettleAllSalaries } from './settle-all-salaries'

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
  const currentRole = session?.user?.role
  const isSuperAdmin = currentRole === 'SUPER_ADMIN'
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'
  const isOwner = currentRole === 'OWNER'
  const canModify = isAdmin && !isOwner

  const [selected, setSelected] = useState<number | null>(null)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState<string>('')

  const handleEditSave = async (txId: number) => {
    try {
      await editAdvance(txId, parseFloat(editAmount))
      setEditingRow(null)
    } catch(e) {
      alert("Failed to edit advance. Ensure you are a system administrator.")
    }
  }

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const staffTxs = transactions.filter(
    tx => tx.staffId !== undefined && tx.staffId === selected && tx.type === 'ADVANCE'
  )

  const totalAdvances = staffTxs.reduce((sum, tx) => {
    if (!tx.isSettled) {
      return sum + tx.amount
    }
    return sum
  }, 0)

  const selectedStaff = staff.find(s => s.id === selected)
  const netSalary = selectedStaff ? selectedStaff.baseSalary - totalAdvances : 0

  const staffSummary = staff.map(s => {
    const sTxs = transactions.filter(tx => {
      return tx.staffId === s.id && !tx.isSettled
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
        {!selected && canModify && (
          <div className="flex gap-2">
            <SettleAllSalaries />
            <PdfReportButton 
              staffSummary={staffSummary} 
              totals={{ base: totalBase, advances: totalAllAdvances, deductions: totalDeductions, net: allNetSalary }} 
            />
          </div>
        )}
        {!selected && isOwner && (
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
            
            {canModify && (
              <div className="sm:col-span-3 flex justify-end">
                <SalarySettlementModal 
                  staff={{ id: selectedStaff.id, name: selectedStaff.name, baseSalary: selectedStaff.baseSalary }}
                  advances={staffTxs}
                  totalAdvances={totalAdvances}
                  netPaid={netSalary}
                />
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border rounded-xl dark:border-gray-800">
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
                            <span className={tx.amount < 0 ? 'text-blue-600' : ''}>
                              {tx.amount.toFixed(2)}
                            </span>
                            {tx.isInternal && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase">Correction</span>
                            )}
                            {isSuperAdmin && !isOwner && !tx.isInternal && (
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

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-4">
            {staffTxs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 text-sm">No advances this month.</p>
              </div>
            ) : (
              staffTxs.map(tx => (
                <div key={tx.id} className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                        <DollarSign size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">#{tx.id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tx.isSettled ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                      {tx.isSettled ? t('settled') : t('unsettled')}
                    </span>
                  </div>

                  <div className="flex justify-between items-end border-t border-gray-50 dark:border-gray-900 pt-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Amount</p>
                      {editingRow === tx.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input 
                            type="number" 
                            className="w-full max-w-[120px] p-2 border rounded-lg text-lg font-bold bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            value={editAmount} 
                            onChange={e => setEditAmount(e.target.value)} 
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className={`text-xl font-black tabular-nums ${tx.amount < 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {tx.amount.toFixed(2)}
                          </p>
                          {tx.isInternal && (
                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Correction</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Date</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{format(new Date(tx.createdAt), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-medium uppercase mb-1">Notes</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                      {tx.description || 'No description provided'}
                    </p>
                  </div>

                  {canModify && !tx.isInternal && (
                    <div className="pt-2">
                    {editingRow === tx.id ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditSave(tx.id)} 
                          className="flex-1 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                          Save Changes
                        </button>
                        <button 
                          onClick={() => setEditingRow(null)} 
                          className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setEditingRow(tx.id); setEditAmount(tx.amount.toString()); }}
                        className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-100 active:scale-95 transition-all"
                      >
                        Modify Transaction
                      </button>
                    )}
                    </div>
                  )}
                </div>
              ))
            )}
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
