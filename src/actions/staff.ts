'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function getStaffList() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  return prisma.staff.findMany({
    where: { isActive: true },
    include: {
      transactions: true,
      salarySettlements: {
        orderBy: { paidAt: 'desc' },
        include: { transactions: true }
      },
      absenceRecords: {
        where: { month, year },
        orderBy: { createdAt: 'desc' },
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function addStaff(data: { 
  name: string; 
  baseSalary: number;
  safetyAllowance?: number;
  overtimeAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  overtimeMultiplier?: number;
  monthlyHours?: number;
  idNumber?: string;
  nationality?: string;
  userId?: string;
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }
  
  const staff = await prisma.staff.create({
    data: {
      name: data.name,
      baseSalary: data.baseSalary,
      safetyAllowance: data.safetyAllowance || 0,
      overtimeAllowance: data.overtimeAllowance || 0,
      transportAllowance: data.transportAllowance || 0,
      otherAllowance: data.otherAllowance || 0,
      overtimeMultiplier: data.overtimeMultiplier || 1.5,
      monthlyHours: data.monthlyHours || 208,
      idNumber: data.idNumber,
      nationality: data.nationality,
      userId: data.userId || null,
    }
  })
  revalidatePath('/staff')
  revalidatePath('/')
  return staff
}

export async function getStaffWithAdvances(staffId: number) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      transactions: {
        where: { type: 'ADVANCE' },
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  return staff
}

export async function getStaffOverdueCredits(staffId: number) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { userId: true }
  })

  if (!staff?.userId) return { count: 0, total: 0, invoices: [] }

  const overdueCredits = await prisma.transaction.findMany({
    where: {
      type: 'SALE',
      method: 'CREDIT',
      isSettled: false,
      recordedById: staff.userId,
      OR: [
        { dueDate: { lt: new Date() } },
        { dueDate: null }
      ]
    },
    include: { linkedBy: { select: { amount: true } } }
  })

  let totalOverdueRemaining = 0
  const unpaidInvoices = []

  for (const creditTx of overdueCredits) {
    const paidSoFar = creditTx.linkedBy.reduce((sum, p) => sum + p.amount, 0)
    const remaining = creditTx.amount - paidSoFar
    if (remaining > 0.01) {
      totalOverdueRemaining += remaining
      unpaidInvoices.push({ ...creditTx, remaining })
    }
  }

  return {
    count: unpaidInvoices.length,
    total: totalOverdueRemaining,
    invoices: unpaidInvoices
  }
}

export async function updateStaff(id: number, data: { 
  name: string; 
  baseSalary: number;
  safetyAllowance?: number;
  overtimeAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  overtimeMultiplier?: number;
  monthlyHours?: number;
  idNumber?: string;
  nationality?: string;
  userId?: string;
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }
  
  const staff = await prisma.staff.update({
    where: { id },
    data: {
      name: data.name,
      baseSalary: data.baseSalary,
      safetyAllowance: data.safetyAllowance || 0,
      overtimeAllowance: data.overtimeAllowance || 0,
      transportAllowance: data.transportAllowance || 0,
      otherAllowance: data.otherAllowance || 0,
      overtimeMultiplier: data.overtimeMultiplier || 1.5,
      monthlyHours: data.monthlyHours || 208,
      idNumber: data.idNumber,
      nationality: data.nationality,
      userId: data.userId === 'none' ? null : (data.userId || null),
    }
  })
  revalidatePath('/staff')
  revalidatePath('/')
  return staff
}

// ── Absence Record Actions ──────────────────────────────────────────────────

export async function addAbsenceRecord(data: {
  staffId: number
  month: number
  year: number
  hours: number
  reason?: string
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }

  if (data.hours <= 0) throw new Error("Hours must be greater than 0")

  const record = await prisma.absenceRecord.create({
    data: {
      staffId: data.staffId,
      month: data.month,
      year: data.year,
      hours: data.hours,
      reason: data.reason || null,
      recordedById: session.user.id,
    }
  })
  revalidatePath('/staff')
  return record
}

export async function deleteAbsenceRecord(id: number) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }

  await prisma.absenceRecord.delete({ where: { id } })
  revalidatePath('/staff')
}

export async function getAbsenceRecords(staffId: number, month: number, year: number) {
  return prisma.absenceRecord.findMany({
    where: { staffId, month, year },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// ── ERP Workspace Server Actions ────────────────────────────────────────────

/**
 * Lightweight staff list for the sidebar — only fields needed for display.
 * Includes unsettled advance total for balance indicator.
 */
export async function getStaffListSummary() {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      baseSalary: true,
      safetyAllowance: true,
      transportAllowance: true,
      otherAllowance: true,
      isActive: true,
      transactions: {
        where: {
          isSettled: false,
          type: { in: ['ADVANCE', 'EXPENSE'] },
          isInternal: false,
        },
        select: { amount: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return staff.map(s => ({
    id: s.id,
    name: s.name,
    baseSalary: s.baseSalary,
    totalMonthlySalary: s.baseSalary + (s.safetyAllowance || 0) + (s.transportAllowance || 0) + (s.otherAllowance || 0),
    unsettledAdvancesTotal: s.transactions.reduce((sum, t) => sum + t.amount, 0),
    isActive: s.isActive,
  }))
}

/**
 * Full employee profile for the Overview tab.
 */
export async function getStaffProfile(staffId: number) {
  return prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      idNumber: true,
      nationality: true,
      baseSalary: true,
      safetyAllowance: true,
      overtimeAllowance: true,
      transportAllowance: true,
      otherAllowance: true,
      overtimeMultiplier: true,
      monthlyHours: true,
      joiningDate: true,
      isActive: true,
      userId: true,
    },
  })
}

/**
 * Paginated, server-filtered advances and expenses for the Advances tab.
 * filter: 'all' | 'pending' | 'settled'
 */
export async function getStaffAdvances(
  staffId: number,
  filter: 'all' | 'pending' | 'settled' = 'all',
  page: number = 1,
  pageSize: number = 20
) {
  const whereSettled =
    filter === 'pending' ? false : filter === 'settled' ? true : undefined

  const where: any = {
    staffId,
    type: { in: ['ADVANCE', 'EXPENSE'] },
    isInternal: false,
    ...(whereSettled !== undefined ? { isSettled: whereSettled } : {}),
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        amount: true,
        method: true,
        description: true,
        isSettled: true,
        createdAt: true,
        salarySettlementId: true,
        recordedBy: { select: { name: true } },
      },
    }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

/**
 * Paginated, server-filtered all staff transactions for the Transactions tab.
 * filter: 'all' | 'ADVANCE' | 'EXPENSE' | 'SALARY_PAYMENT' | 'pending' | 'settled'
 */
export async function getStaffTransactions(
  staffId: number,
  filter: string = 'all',
  page: number = 1,
  pageSize: number = 20
) {
  const where: any = { staffId, isInternal: false }

  if (filter === 'pending') {
    where.isSettled = false
  } else if (filter === 'settled') {
    where.isSettled = true
  } else if (['ADVANCE', 'EXPENSE', 'SALARY_PAYMENT'].includes(filter)) {
    where.type = filter
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        amount: true,
        method: true,
        description: true,
        isSettled: true,
        createdAt: true,
        salarySettlementId: true,
        recordedBy: { select: { name: true } },
      },
    }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

/**
 * Deactivate a staff member (soft delete — sets isActive to false).
 */
export async function deactivateStaff(id: number) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  await prisma.staff.update({ where: { id }, data: { isActive: false } })
  revalidatePath('/staff')
}

