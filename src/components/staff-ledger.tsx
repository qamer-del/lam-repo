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
import { SalarySettlementPdfButton } from './salary-settlement-pdf-button'
import { Printer, History } from 'lucide-react'

type SalarySettlement = {
  id: number
  month: number
  year: number
  baseSalary: number
  advancesTally: number
  netPaid: number
  method: string
  paidAt: Date
  transactions: Transaction[]
}

type Staff = {
  id: number
  name: string
  baseSalary: number
  isActive: boolean
  idNumber?: string
  nationality?: string
  salarySettlements?: SalarySettlement[]
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
  isInternal?: boolean
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
  const canModify = isAdmin || isOwner

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

  let staffTxs = transactions
    .filter(tx => tx.staffId != null && Number(tx.staffId) === Number(selected) && (tx.type === 'ADVANCE' || tx.type === 'EXPENSE'))
    .map(tx => ({ ...tx }))

  // For non-super admins, merge corrections into original transactions and hide internal ones
  if (!isSuperAdmin) {
    const corrections = staffTxs.filter(tx => tx.isInternal)
    const originals = staffTxs.filter(tx => !tx.isInternal)

    corrections.forEach(c => {
      const match = c.description?.match(/\[CORRECTION FOR #(\d+)\]/)
      if (match) {
        const targetId = parseInt(match[1])
        const target = originals.find(o => o.id === targetId)
        if (target) {
          target.amount += c.amount
        }
      }
    })

    staffTxs = originals
  }

  const selectedAdvances = staffTxs.filter(tx => tx.type === 'ADVANCE').reduce((sum, tx) => {
    return !tx.isSettled ? sum + tx.amount : sum
  }, 0)

  const selectedDeductions = staffTxs.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => {
    return !tx.isSettled ? sum + tx.amount : sum
  }, 0)

  const totalStaffTotalDebt = selectedAdvances + selectedDeductions

  const selectedStaff = staff.find(s => Number(s.id) === Number(selected))
  const netSalary = selectedStaff ? selectedStaff.baseSalary - totalStaffTotalDebt : 0

  const staffSummary = staff.map(s => {
    const sTxs = transactions.filter(tx => {
      return Number(tx.staffId) === Number(s.id) && !tx.isSettled
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 flex items-center gap-2 p-1.5 bg-gray-100/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl overflow-x-auto no-scrollbar border border-gray-200/50 dark:border-gray-800/50 shadow-inner">
          <button
            onClick={() => setSelected(null)}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 ${
              selected === null
                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('overviewReport')}
          </button>
          {staff?.map(s => (
            <button
              key={s?.id || Math.random()}
              onClick={() => setSelected(s?.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 ${
                selected === s?.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {!selected && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isAdmin && <SettleAllSalaries />}
            <PdfReportButton 
              staffSummary={staffSummary} 
              totals={{ base: totalBase, advances: totalAllAdvances, deductions: totalDeductions, net: allNetSalary }} 
            />
          </div>
        )}
      </div>

      {selected && selectedStaff && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-2">
                  <User size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('staffMembers')}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white break-words">{selectedStaff.name}</p>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID: <span className="text-gray-900 dark:text-gray-200">{selectedStaff.idNumber || 'N/A'}</span></p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nationality: <span className="text-gray-900 dark:text-gray-200">{selectedStaff.nationality || 'N/A'}</span></p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-2">
                  <Wallet size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Base Salary</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                  {selectedStaff.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 mb-2">
                  <DollarSign size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Advances & Deductions</p>
                <p className="text-3xl font-black text-orange-600 tabular-nums">
                  {totalStaffTotalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500 sm:col-span-3">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-2">
                  <Landmark size={32} />
                </div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Net Payable Salary</p>
                <p className={`text-5xl font-black tabular-nums ${netSalary < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            {canModify && (
              <div className="sm:col-span-3 flex justify-center pt-2">
                <SalarySettlementModal 
                  staff={{ id: selectedStaff.id, name: selectedStaff.name, baseSalary: selectedStaff.baseSalary }}
                  advances={staffTxs}
                  totalAdvances={totalStaffTotalDebt}
                  netPaid={netSalary}
                />
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400 pl-6">#</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">{t('amount')}</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">{t('description')}</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">{t('reportDate')}</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400 pr-6">{t('settled')}</TableHead>
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
                    <TableRow key={tx.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <TableCell className="pl-6 py-4 font-bold text-gray-400">#{tx.id}</TableCell>
                      <TableCell className="py-4">
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
                            {(isSuperAdmin || isOwner) && tx.isInternal && (
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
          <div className="md:hidden space-y-6">
            {staffTxs.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 font-medium">No advances this month.</p>
              </div>
            ) : (
              staffTxs.map(tx => (
                <div key={tx.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
                  <div className="flex justify-between items-center relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shadow-sm">
                        <DollarSign size={20} />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white">Transaction #{tx.id}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${tx.isSettled ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
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
                          {(isSuperAdmin || isOwner) && tx.isInternal && (
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

                  {isSuperAdmin && !tx.isInternal && (
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
          {/* Payment History Section */}
          {selectedStaff.salarySettlements && selectedStaff.salarySettlements.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 px-1">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Payment History</h3>
                  <p className="text-xs text-gray-500 font-medium">Historical salary settlements and records</p>
                </div>
              </div>
              
              <div className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="h-12 font-black uppercase text-[10px] tracking-wider text-gray-400 pl-6">Period</TableHead>
                      <TableHead className="h-12 font-black uppercase text-[10px] tracking-wider text-gray-400 text-center">Net Paid</TableHead>
                      <TableHead className="h-12 font-black uppercase text-[10px] tracking-wider text-gray-400 text-center">Method</TableHead>
                      <TableHead className="h-12 font-black uppercase text-[10px] tracking-wider text-gray-400 text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStaff?.salarySettlements?.map((settlement) => (
                      <TableRow key={settlement?.id || Math.random()} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <TableCell className="pl-6 py-3">
                          <p className="font-bold text-sm">{format(new Date(settlement.year, settlement.month - 1), 'MMMM yyyy')}</p>
                          <p className="text-[10px] text-gray-400">{format(new Date(settlement.paidAt), 'PPP')}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="font-black text-emerald-600 tabular-nums">{settlement.netPaid.toFixed(2)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {settlement.method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <SalarySettlementPdfButton 
                            staffName={selectedStaff.name} 
                            idNumber={selectedStaff.idNumber}
                            nationality={selectedStaff.nationality}
                            settlement={settlement} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {!selected && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-2">
                  <Landmark size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Base Salaries</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 mb-2">
                  <DollarSign size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Advances</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalAllAdvances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 mb-2">
                  <AlertCircle size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Deductions</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm group hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
              <div className="relative flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Net Payout</p>
                <p className={`text-2xl font-black tabular-nums ${allNetSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {allNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400 pl-6">{t('staffMembers')}</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Base Salary</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Advances</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Deductions</TableHead>
                  <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400 pr-6">Net Salary</TableHead>
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
                    <TableRow key={s.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <TableCell className="pl-6 py-4 font-black text-gray-900 dark:text-white whitespace-nowrap">{s.name.split(' ')[0]}</TableCell>
                      <TableCell className="py-4 font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">{s.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="py-4 font-bold text-orange-600 whitespace-nowrap tabular-nums">{s.advances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="py-4 font-bold text-red-600 whitespace-nowrap tabular-nums">{s.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={`py-4 pr-6 font-black whitespace-nowrap tabular-nums ${s.netSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {s.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
