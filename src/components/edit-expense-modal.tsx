'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  X, FileEdit, AlertTriangle, Shield, History,
  ChevronDown, ChevronUp, Clock, User2
} from 'lucide-react'
import { editExpense, getExpenseAuditLog, type EditExpenseData } from '@/actions/expenses'
import { cn } from '@/lib/utils'

interface ExpenseRecord {
  id: number
  description?: string | null
  invoiceNumber?: string | null
  expenseCategory?: string | null
  expenseNotes?: string | null
  expenseVendor?: string | null
  amount: number
  createdAt: string | Date
  method: string
  recordedBy?: { name: string } | null
}

interface EditExpenseModalProps {
  expense: ExpenseRecord | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Marketing & Advertising',
  'Office Supplies',
  'Transportation',
  'Maintenance & Repairs',
  'Professional Services',
  'Insurance',
  'Software & Subscriptions',
  'Miscellaneous',
]

export function EditExpenseModal({ expense, isOpen, onClose, onSuccess }: EditExpenseModalProps) {
  const [isPending, startTransition] = useTransition()
  const [showHistory, setShowHistory] = useState(false)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [loadingLog, setLoadingLog] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [expenseVendor, setExpenseVendor] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')

  // Populate form when expense changes
  useEffect(() => {
    if (expense) {
      setDescription(expense.description || '')
      setExpenseCategory(expense.expenseCategory || '')
      setExpenseNotes(expense.expenseNotes || '')
      setExpenseVendor(expense.expenseVendor || '')
      setInvoiceNumber(expense.invoiceNumber || '')
      setAmount(String(expense.amount))
      setExpenseDate(
        expense.createdAt
          ? format(new Date(expense.createdAt), 'yyyy-MM-dd')
          : ''
      )
      setShowHistory(false)
      setAuditLog([])
    }
  }, [expense])

  const handleLoadHistory = async () => {
    if (!expense) return
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setLoadingLog(true)
    try {
      const logs = await getExpenseAuditLog(expense.id)
      setAuditLog(logs)
      setShowHistory(true)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load history')
    } finally {
      setLoadingLog(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expense) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount greater than zero.')
      return
    }
    if (!description.trim()) {
      toast.error('Expense title is required.')
      return
    }

    const payload: EditExpenseData = {
      transactionId: expense.id,
      description: description.trim(),
      expenseCategory: expenseCategory.trim() || undefined,
      expenseNotes: expenseNotes.trim() || undefined,
      expenseVendor: expenseVendor.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      amount: amountNum,
      expenseDate: expenseDate || undefined,
    }

    startTransition(async () => {
      try {
        await editExpense(payload)
        toast.success('Expense updated successfully.')
        onSuccess()
        onClose()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update expense.')
      }
    })
  }

  if (!isOpen || !expense) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-purple-600/5" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-600 rounded-2xl shadow-lg shadow-violet-500/20">
                <FileEdit size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                  Edit Expense Invoice
                </h2>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  ID #{expense.id} · {expense.method}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Financial Protection Notice */}
        <div className="mx-6 mt-4 flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
          <Shield size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-black">Financial accounts are protected.</span> The original payment source, cash balances, settlements, and financial linkages will not be affected by this edit.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Row 1: Title + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Expense Title <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly Rent"
                className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Category
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
              >
                <option value="">— Select category —</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Vendor + Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Vendor / Supplier
              </label>
              <input
                type="text"
                value={expenseVendor}
                onChange={(e) => setExpenseVendor(e.target.value)}
                placeholder="e.g. SABIC Co."
                className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Reference Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2024-001"
                className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 3: Amount + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Amount (SAR) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Expense Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Notes / Memo
            </label>
            <textarea
              rows={3}
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
              placeholder="Additional notes or details about this expense..."
              className="w-full px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Audit Warning */}
          <div className="flex items-start gap-2.5 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl">
            <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 leading-relaxed">
              This edit will be permanently recorded in the audit log with your name and timestamp. All changes are irreversible.
            </p>
          </div>
        </form>

        {/* Audit History Toggle */}
        <div className="px-6 pb-2">
          <button
            type="button"
            onClick={handleLoadHistory}
            disabled={loadingLog}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors group"
          >
            <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
              <History size={13} />
              Edit History
            </div>
            {loadingLog ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : showHistory ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {auditLog.length === 0 ? (
                <p className="text-center text-[11px] text-gray-400 py-4 font-bold">No edit history found.</p>
              ) : (
                auditLog.map((log) => {
                  const old = log.oldValues as any
                  const nw = log.newValues as any
                  return (
                    <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <User2 size={11} className="text-violet-500" />
                        <span className="text-[10px] font-black text-violet-600 dark:text-violet-400">
                          {log.editedBy?.name || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          <Clock size={10} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400 font-bold">
                            {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {old.description !== nw.description && (
                          <AuditField label="Title" from={old.description} to={nw.description} />
                        )}
                        {old.amount !== nw.amount && (
                          <AuditField label="Amount" from={`${old.amount} SAR`} to={`${nw.amount} SAR`} />
                        )}
                        {old.expenseCategory !== nw.expenseCategory && (
                          <AuditField label="Category" from={old.expenseCategory || '—'} to={nw.expenseCategory || '—'} />
                        )}
                        {old.expenseVendor !== nw.expenseVendor && (
                          <AuditField label="Vendor" from={old.expenseVendor || '—'} to={nw.expenseVendor || '—'} />
                        )}
                        {old.invoiceNumber !== nw.invoiceNumber && (
                          <AuditField label="Reference" from={old.invoiceNumber || '—'} to={nw.invoiceNumber || '—'} />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-black text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-expense-form"
            disabled={isPending}
            onClick={handleSubmit}
            className={cn(
              "flex-1 h-11 rounded-xl text-sm font-black text-white transition-all",
              isPending
                ? "bg-violet-400 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
            )}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function AuditField({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="flex items-start gap-2 text-[10px]">
      <span className="font-black text-gray-400 uppercase tracking-widest shrink-0 w-16">{label}:</span>
      <span className="text-rose-500 font-bold line-through opacity-70">{from}</span>
      <span className="text-gray-400">→</span>
      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{to}</span>
    </div>
  )
}
