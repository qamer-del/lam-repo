'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

// ── ERP Staff Sidebar ──────────────────────────────────────────────────────

export async function getStaffForSidebar() {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      baseSalary: true,
      safetyAllowance: true,
      overtimeAllowance: true,
      transportAllowance: true,
      otherAllowance: true,
      transactions: {
        where: { isSettled: false, type: { in: ['ADVANCE', 'EXPENSE'] } },
        select: { amount: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  return staff.map(s => ({
    ...s,
    totalUnsettled: s.transactions.reduce((sum, t) => sum + t.amount, 0),
    totalMonthlySalary: s.baseSalary + s.safetyAllowance + s.overtimeAllowance + s.transportAllowance + s.otherAllowance,
  }))
}

export async function getStaffProfile(id: number) {
  return prisma.staff.findUnique({
    where: { id },
    include: {
      salarySettlements: {
        orderBy: { paidAt: 'desc' },
        take: 1,
        select: { paidAt: true, netPaid: true, month: true, year: true, settledUpToDate: true },
      },
    },
  })
}

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
