'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export interface EditExpenseData {
  /** Transaction ID of the EXPENSE record to edit */
  transactionId: number
  /** Expense title — maps to Transaction.description */
  description: string
  /** Category label (e.g. Utilities, Rent, Marketing) */
  expenseCategory?: string
  /** Internal notes / memo */
  expenseNotes?: string
  /** Vendor / supplier name (freetext) */
  expenseVendor?: string
  /** Reference / invoice number — maps to Transaction.invoiceNumber */
  invoiceNumber?: string
  /** Amount — the financial amount. Will NOT move money between accounts. */
  amount: number
  /**
   * Expense date override.
   * NOTE: This does NOT re-process any financial settlement or cash balance.
   * It only updates the `createdAt` timestamp for display purposes.
   */
  expenseDate?: string // ISO date string "YYYY-MM-DD"
}

/**
 * Edit an existing EXPENSE transaction.
 *
 * Security:
 *   • SUPER_ADMIN only.
 *
 * Financial safety:
 *   • Does NOT create new transactions.
 *   • Does NOT reverse or re-book the original transaction.
 *   • Does NOT touch: cash balances, bank balances, settlements, agent balances.
 *   • The original `method`, `staffId`, `settlementId`, `shiftId`, `branchId` are NEVER modified.
 *
 * Audit:
 *   • A permanent `ExpenseAuditLog` record is written with oldValues / newValues diff.
 */
export async function editExpense(data: EditExpenseData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can edit expense records.')
  }

  // 1. Load the target transaction
  const tx = await prisma.transaction.findUnique({
    where: { id: data.transactionId },
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      invoiceNumber: true,
      expenseCategory: true,
      expenseNotes: true,
      expenseVendor: true,
      expenseAmount: true,
      expenseTitle: true,
      expenseDate: true,
      expenseInvoice: true,
      createdAt: true,
      // Protection fields — we will never update these
      method: true,
      staffId: true,
      settlementId: true,
      shiftId: true,
      branchId: true,
    }
  })

  if (!tx) throw new Error('Expense record not found.')
  if (tx.type !== 'EXPENSE') {
    throw new Error('Only EXPENSE transactions can be edited via this action.')
  }

  // 2. Build update payload — only descriptive / display fields
  const updatedDate = data.expenseDate ? new Date(data.expenseDate) : undefined

  // 3. Save old snapshot for audit (using shadow fields if they were edited previously, else base)
  const oldValues = {
    description: tx.expenseTitle ?? tx.description,
    invoiceNumber: tx.expenseInvoice ?? tx.invoiceNumber,
    expenseCategory: tx.expenseCategory,
    expenseNotes: tx.expenseNotes,
    expenseVendor: tx.expenseVendor,
    amount: tx.expenseAmount ?? tx.amount,
    createdAt: (tx.expenseDate ?? tx.createdAt).toISOString(),
  }

  const newValues = {
    description: data.description,
    invoiceNumber: data.invoiceNumber ?? tx.invoiceNumber,
    expenseCategory: data.expenseCategory ?? null,
    expenseNotes: data.expenseNotes ?? null,
    expenseVendor: data.expenseVendor ?? null,
    amount: data.amount,
    createdAt: updatedDate ? updatedDate.toISOString() : tx.createdAt.toISOString(),
  }

  // 4. Execute atomically
  await prisma.$transaction(async (p) => {
    // Update ONLY the shadow fields. The base transaction fields remain untouched.
    await p.transaction.update({
      where: { id: data.transactionId },
      data: {
        expenseTitle: data.description,
        expenseInvoice: data.invoiceNumber,
        expenseCategory: data.expenseCategory ?? null,
        expenseNotes: data.expenseNotes ?? null,
        expenseVendor: data.expenseVendor ?? null,
        expenseAmount: data.amount,
        expenseDate: updatedDate,
        // ⚡ NEVER update: amount, description, invoiceNumber, createdAt, method, staffId, settlementId, shiftId, branchId, agentId, type
      }
    })

    // Write immutable audit record
    await p.expenseAuditLog.create({
      data: {
        transactionId: data.transactionId,
        editedById: session.user.id,
        oldValues,
        newValues,
      }
    })
  })

  // ─── Revalidation strategy ────────────────────────────────────────────────
  // Only the Finance admin page is revalidated so the updated descriptive fields
  // are visible to SUPER_ADMIN there.
  //
  // We deliberately do NOT revalidate:
  //   • '/'        — Dashboard must never show expense edits in activity widgets
  //   • '/activity' — Activity feed must only show the original creation event
  //
  // The ExpenseAuditLog is a separate model and is NEVER queried by dashboards
  // or activity feeds; it is only accessible through the Finance page audit trail.
  revalidatePath('/admin/finance')

  return { success: true }
}

/**
 * Fetch audit log entries for a specific expense transaction.
 * Used in the edit modal to display history. SUPER_ADMIN only.
 */
export async function getExpenseAuditLog(transactionId: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can view expense audit logs.')
  }

  const logs = await prisma.expenseAuditLog.findMany({
    where: { transactionId },
    orderBy: { createdAt: 'desc' },
    include: {
      editedBy: { select: { name: true } }
    }
  })

  return logs
}
