'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { isFridayDate } from '@/lib/payroll-engine'

// ── Attendance Record Actions ────────────────────────────────────────────────

export async function addAttendanceRecord(data: {
  staffId: number
  date: string // ISO date string e.g. "2025-08-15"
  clockIn: string // e.g. "08:00"
  clockOut: string // e.g. "20:00"
  note?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // Build datetime objects from date + time strings
  const dateObj = new Date(data.date + 'T00:00:00')
  const [inH, inM] = data.clockIn.split(':').map(Number)
  const [outH, outM] = data.clockOut.split(':').map(Number)

  const clockInDt = new Date(data.date + `T${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}:00`)
  const clockOutDt = new Date(data.date + `T${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}:00`)

  if (clockOutDt <= clockInDt) {
    throw new Error('Clock-out must be after clock-in')
  }

  const workedMs = clockOutDt.getTime() - clockInDt.getTime()
  const workedHours = Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100

  const friday = isFridayDate(dateObj)

  const record = await prisma.attendanceRecord.upsert({
    where: { staffId_date: { staffId: data.staffId, date: dateObj } },
    create: {
      staffId: data.staffId,
      date: dateObj,
      clockIn: clockInDt,
      clockOut: clockOutDt,
      workedHours,
      isFriday: friday,
      note: data.note || null,
      recordedById: session.user.id,
    },
    update: {
      clockIn: clockInDt,
      clockOut: clockOutDt,
      workedHours,
      isFriday: friday,
      note: data.note || null,
      recordedById: session.user.id,
    },
  })

  revalidatePath('/staff/payroll')
  return record
}

export async function bulkAddAttendance(records: {
  staffId: number
  date: string
  clockIn: string
  clockOut: string
  note?: string
}[]) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const results = []
  for (const r of records) {
    try {
      const result = await addAttendanceRecord(r)
      results.push({ success: true, date: r.date, record: result })
    } catch (err: any) {
      results.push({ success: false, date: r.date, error: err.message })
    }
  }

  revalidatePath('/staff/payroll')
  return results
}

export async function deleteAttendanceRecord(id: number) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  await prisma.attendanceRecord.delete({ where: { id } })
  revalidatePath('/staff/payroll')
}

export async function getAttendanceRecords(staffId: number, from: Date, to: Date) {
  return prisma.attendanceRecord.findMany({
    where: {
      staffId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: 'asc' },
  })
}

// ── Payroll Data Fetching ────────────────────────────────────────────────────

export async function getPayrollPageData(staffId: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      salarySettlements: {
        orderBy: { paidAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!staff) throw new Error('Staff not found')

  return staff
}

/**
 * Get last settlement for a staff member to determine the next period start
 */
export async function getLastSettlement(staffId: number) {
  return prisma.salarySettlement.findFirst({
    where: { staffId },
    orderBy: { paidAt: 'desc' },
  })
}

/**
 * Get unsettled advances and expense transactions for a staff member.
 * Respects monthlyDeductionLimit — if set, only deducts up to that amount this settlement.
 */
export async function getUnsettledAdvances(staffId: number) {
  const txs = await prisma.transaction.findMany({
    where: {
      staffId,
      isSettled: false,
      type: { in: ['ADVANCE', 'EXPENSE'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  const advances = txs.filter(t => t.type === 'ADVANCE')
  const deductions = txs.filter(t => t.type === 'EXPENSE')

  // Compute effective deduction per transaction (respecting installment cap)
  const effectiveAdvances = advances.map(t => ({
    ...t,
    effectiveDeduction: t.monthlyDeductionLimit
      ? Math.min(t.amount, t.monthlyDeductionLimit)
      : t.amount,
  }))
  const effectiveDeductions = deductions.map(t => ({
    ...t,
    effectiveDeduction: t.monthlyDeductionLimit
      ? Math.min(t.amount, t.monthlyDeductionLimit)
      : t.amount,
  }))

  const advancesTotal = effectiveAdvances.reduce((s, t) => s + t.effectiveDeduction, 0)
  const deductionsTotal = effectiveDeductions.reduce((s, t) => s + t.effectiveDeduction, 0)

  return { advances: effectiveAdvances, deductions: effectiveDeductions, advancesTotal, deductionsTotal }
}

// ── ERP Salary Settlement ────────────────────────────────────────────────────

export async function settleSalaryV2(data: {
  staffId: number
  month: number
  year: number
  settlementFrom: Date
  settledUpToDate: Date
  // Calculated by payroll engine (passed from client to avoid re-calc)
  baseSalaryEarned: number
  workedDays: number
  totalDays: number
  officialHours: number
  overtimeHours: number
  fridayHours: number
  overtimeAmount: number
  fridayOvertimeAmount: number
  targetSalaryAdjustment: number
  overtimeMultiplier: number
  safetyAllowance: number
  transportAllowance: number
  otherAllowance: number
  bonus: number
  advancesTotal: number
  otherDeductions: number
  absenceDeduction: number
  netPaid: number
  method: 'CASH' | 'NETWORK' | 'SPLIT'
  cashSource?: 'CASH_DRAWER' | 'SALARY_FUND'
  cashAmount?: number
  networkAmount?: number
}) {
  const session = await auth()
  if (
    session?.user?.role !== 'SUPER_ADMIN' &&
    session?.user?.role !== 'ADMIN' &&
    session?.user?.role !== 'OWNER'
  ) {
    throw new Error('Unauthorized')
  }

  // Fetch staff and unsettled transactions (with effective deduction amounts)
  const staff = await prisma.staff.findUnique({
    where: { id: data.staffId },
    include: {
      transactions: {
        where: {
          isSettled: false,
          type: { in: ['ADVANCE', 'EXPENSE'] },
        },
      },
    },
  })
  if (!staff) throw new Error('Staff not found')

  // Check for period overlap — prevent duplicate settlements
  if (data.settlementFrom) {
    const overlapping = await prisma.salarySettlement.findFirst({
      where: {
        staffId: data.staffId,
        AND: [
          { settlementFrom: { lte: data.settledUpToDate } },
          { settledUpToDate: { gte: data.settlementFrom } },
        ],
      },
    })
    if (overlapping) {
      throw new Error(
        `Settlement period overlaps with existing settlement (ID: ${overlapping.id}). ` +
        `Previous settlement covered up to ${overlapping.settledUpToDate?.toLocaleDateString()}.`
      )
    }
  }

  const fullBaseSalary = staff.baseSalary

  // Create the salary settlement record
  const salarySettlement = await prisma.salarySettlement.create({
    data: {
      staffId: data.staffId,
      month: data.month,
      year: data.year,
      settlementFrom: data.settlementFrom,
      settledUpToDate: data.settledUpToDate,
      baseSalary: fullBaseSalary,
      earnedSalary: data.baseSalaryEarned,
      workedDays: data.workedDays,
      totalDays: data.totalDays,
      safetyAllowance: data.safetyAllowance,
      transportAllowance: data.transportAllowance,
      otherAllowance: data.otherAllowance,
      bonus: data.bonus,
      officialHours: data.officialHours,
      overtimeHours: data.overtimeHours,
      fridayHours: data.fridayHours,
      overtimeAmount: data.overtimeAmount,
      fridayOvertimeAmount: data.fridayOvertimeAmount,
      overtimeMultiplier: data.overtimeMultiplier,
      targetSalaryAdjustment: data.targetSalaryAdjustment,
      advancesTally: data.advancesTotal + data.otherDeductions,
      absenceHours: 0,
      absenceDeduction: data.absenceDeduction,
      netPaid: data.netPaid,
      method: data.method === 'SPLIT' ? 'CASH' : data.method,
      cashSource: data.method === 'CASH' ? (data.cashSource || 'SALARY_FUND') : null,
    },
  })

  // Handle advance settlement — respecting monthlyDeductionLimit (installments)
  for (const tx of staff.transactions) {
    const effectiveDeduction = tx.monthlyDeductionLimit
      ? Math.min(tx.amount, tx.monthlyDeductionLimit)
      : tx.amount

    if (effectiveDeduction >= tx.amount) {
      // Fully settle this transaction
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { isSettled: true, salarySettlementId: salarySettlement.id },
      })
    } else {
      // Installment: create a deduction record linked to settlement, keep original open
      await prisma.transaction.create({
        data: {
          type: 'ADVANCE',
          amount: -effectiveDeduction, // negative = deduction credit
          method: 'CASH',
          description: `Installment deduction — Advance #${tx.id} (${effectiveDeduction.toFixed(2)} of ${tx.amount.toFixed(2)} SAR)`,
          staffId: data.staffId,
          recordedById: session.user.id,
          isSettled: true,
          salarySettlementId: salarySettlement.id,
          linkedTransactionId: tx.id,
        },
      })
    }
  }

  // Record payment transaction(s)
  const paymentTransactions: any[] = []

  if (data.netPaid > 0) {
    if (data.method === 'SPLIT') {
      const cashAmt = data.cashAmount || 0
      const netAmt = data.networkAmount || 0

      if (cashAmt > 0) {
        const cashTx = await prisma.transaction.create({
          data: {
            type: 'SALARY_PAYMENT',
            amount: cashAmt,
            method: 'CASH',
            description: `ERP Salary (Cash) — ${data.month}/${data.year}`,
            staffId: data.staffId,
            recordedById: session.user.id,
            isSettled: true,
            salarySettlementId: salarySettlement.id,
          },
          include: { recordedBy: { select: { name: true } } },
        })
        paymentTransactions.push(cashTx)
      }

      if (netAmt > 0) {
        const netTx = await prisma.transaction.create({
          data: {
            type: 'SALARY_PAYMENT',
            amount: netAmt,
            method: 'NETWORK',
            description: `ERP Salary (Network) — ${data.month}/${data.year}`,
            staffId: data.staffId,
            recordedById: session.user.id,
            isSettled: true,
            salarySettlementId: salarySettlement.id,
          },
          include: { recordedBy: { select: { name: true } } },
        })
        paymentTransactions.push(netTx)
      }
    } else {
      const singleTx = await prisma.transaction.create({
        data: {
          type: 'SALARY_PAYMENT',
          amount: data.netPaid,
          method: data.method as 'CASH' | 'NETWORK',
          description: `ERP Salary Payment — ${data.month}/${data.year}`,
          staffId: data.staffId,
          recordedById: session.user.id,
          isSettled: true,
          salarySettlementId: salarySettlement.id,
        },
        include: { recordedBy: { select: { name: true } } },
      })
      paymentTransactions.push(singleTx)
    }
  }

  revalidatePath('/')
  revalidatePath('/staff')
  revalidatePath('/staff/payroll')

  return {
    ...salarySettlement,
    paymentTransactions,
    cashAmount: data.method === 'SPLIT' ? data.cashAmount : undefined,
    networkAmount: data.method === 'SPLIT' ? data.networkAmount : undefined,
  }
}

// ── Payroll List Data ────────────────────────────────────────────────────────

export async function getAllStaffForPayroll() {
  return prisma.staff.findMany({
    where: { isActive: true },
    include: {
      salarySettlements: {
        orderBy: { paidAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getPayrollHistory(staffId: number) {
  return prisma.salarySettlement.findMany({
    where: { staffId },
    orderBy: { paidAt: 'desc' },
    include: {
      transactions: {
        where: { type: 'SALARY_PAYMENT' },
        select: { id: true, amount: true, method: true },
      },
    },
  })
}

// ── ERP Tab Queries ──────────────────────────────────────────────────────

export async function getStaffAdvancesTab(
  staffId: number,
  filter: 'all' | 'pending' | 'settled' = 'all',
  page = 1
) {
  const pageSize = 10
  const where = {
    staffId,
    type: { in: ['ADVANCE', 'EXPENSE'] as any[] },
    ...(filter === 'pending' ? { isSettled: false } : {}),
    ...(filter === 'settled' ? { isSettled: true } : {}),
  }

  // Fetch all matching transactions including internal corrections
  const allTxs = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      salarySettlement: {
        select: { id: true, month: true, year: true, paidAt: true },
      },
    },
  })

  // Split out corrections and merge their amounts into the original transaction
  // so the UI shows the current effective value, not the raw original DB value.
  const corrections = allTxs.filter(tx => tx.isInternal)
  const originals = allTxs.filter(tx => !tx.isInternal).map(tx => ({ ...tx }))

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

  // Paginate on the merged originals
  const total = originals.length
  const transactions = originals.slice((page - 1) * pageSize, page * pageSize)

  return { transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
