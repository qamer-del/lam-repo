'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

async function assertAdmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session
}

/** One row per active employee — total paid, average monthly, last settlement date */
export async function getPayrollSummaryReport(year: number) {
  await assertAdmin()
  const settlements = await prisma.salarySettlement.findMany({
    where: { year },
    include: { staff: { select: { id: true, name: true, isActive: true } } },
    orderBy: { paidAt: 'desc' },
  })

  const byStaff = new Map<number, {
    id: number; name: string
    totalPaid: number; count: number; lastPaidAt: Date | null
  }>()

  for (const s of settlements) {
    const existing = byStaff.get(s.staffId)
    if (existing) {
      existing.totalPaid += s.netPaid
      existing.count += 1
      if (!existing.lastPaidAt || s.paidAt > existing.lastPaidAt) existing.lastPaidAt = s.paidAt
    } else {
      byStaff.set(s.staffId, {
        id: s.staffId,
        name: s.staff.name,
        totalPaid: s.netPaid,
        count: 1,
        lastPaidAt: s.paidAt,
      })
    }
  }

  return Array.from(byStaff.values()).map(r => ({
    ...r,
    avgMonthly: r.count > 0 ? r.totalPaid / r.count : 0,
  })).sort((a, b) => a.name.localeCompare(b.name))
}

/** Attendance hours per employee per month */
export async function getAttendanceReport(year: number, month?: number) {
  await assertAdmin()

  const startDate = month
    ? new Date(year, month - 1, 1)
    : new Date(year, 0, 1)
  const endDate = month
    ? new Date(year, month, 0, 23, 59, 59)
    : new Date(year, 11, 31, 23, 59, 59)

  const records = await prisma.attendanceRecord.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { staff: { select: { id: true, name: true } } },
    orderBy: [{ staff: { name: 'asc' } }, { date: 'asc' }],
  })

  const byStaff = new Map<number, {
    id: number; name: string
    days: number; totalHours: number; otHours: number; fridayHours: number
  }>()

  for (const r of records) {
    const officialDailyHours = 8 // use default; per-employee later
    const existing = byStaff.get(r.staffId)
    const isOT = !r.isFriday && r.workedHours > officialDailyHours
    const otH = isOT ? r.workedHours - officialDailyHours : 0
    const friH = r.isFriday ? r.workedHours : 0

    if (existing) {
      existing.days += 1
      existing.totalHours += r.workedHours
      existing.otHours += otH
      existing.fridayHours += friH
    } else {
      byStaff.set(r.staffId, {
        id: r.staffId,
        name: r.staff.name,
        days: 1,
        totalHours: r.workedHours,
        otHours: otH,
        fridayHours: friH,
      })
    }
  }

  return Array.from(byStaff.values())
}

/** Overtime amounts per employee for the year */
export async function getOvertimeReport(year: number) {
  await assertAdmin()
  const settlements = await prisma.salarySettlement.findMany({
    where: { year },
    include: { staff: { select: { id: true, name: true } } },
    orderBy: { paidAt: 'asc' },
  })

  const byStaff = new Map<number, {
    id: number; name: string
    overtimeHours: number; fridayHours: number
    overtimeAmount: number; fridayOvertimeAmount: number; totalOTPay: number
  }>()

  for (const s of settlements) {
    const existing = byStaff.get(s.staffId)
    const totalOTPay = s.overtimeAmount + s.fridayOvertimeAmount
    if (existing) {
      existing.overtimeHours += s.overtimeHours
      existing.fridayHours += s.fridayHours
      existing.overtimeAmount += s.overtimeAmount
      existing.fridayOvertimeAmount += s.fridayOvertimeAmount
      existing.totalOTPay += totalOTPay
    } else {
      byStaff.set(s.staffId, {
        id: s.staffId,
        name: s.staff.name,
        overtimeHours: s.overtimeHours,
        fridayHours: s.fridayHours,
        overtimeAmount: s.overtimeAmount,
        fridayOvertimeAmount: s.fridayOvertimeAmount,
        totalOTPay,
      })
    }
  }

  return Array.from(byStaff.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/** Advance totals vs recovered amounts per employee */
export async function getAdvanceDeductionReport(year: number) {
  await assertAdmin()

  const [advances, settlements] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        type: 'ADVANCE',
        amount: { gt: 0 }, // positive = advance given
        createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) },
      },
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.salarySettlement.findMany({
      where: { year },
      select: { staffId: true, advancesTally: true },
    }),
  ])

  const byStaff = new Map<number, {
    id: number; name: string
    totalAdvanced: number; totalRecovered: number
  }>()

  for (const a of advances) {
    if (!a.staffId) continue
    const existing = byStaff.get(a.staffId)
    if (existing) {
      existing.totalAdvanced += a.amount
    } else {
      byStaff.set(a.staffId, {
        id: a.staffId,
        name: a.staff?.name ?? 'Unknown',
        totalAdvanced: a.amount,
        totalRecovered: 0,
      })
    }
  }

  for (const s of settlements) {
    const existing = byStaff.get(s.staffId)
    if (existing) {
      existing.totalRecovered += s.advancesTally
    }
  }

  return Array.from(byStaff.values()).map(r => ({
    ...r,
    balance: r.totalAdvanced - r.totalRecovered,
  })).sort((a, b) => a.name.localeCompare(b.name))
}

/** Full payroll history for a single employee in a given year */
export async function getEmployeePayrollReport(staffId: number, year: number) {
  await assertAdmin()
  return prisma.salarySettlement.findMany({
    where: { staffId, year },
    orderBy: { paidAt: 'asc' },
    include: {
      staff: { select: { name: true, idNumber: true, nationality: true } },
      transactions: {
        where: { type: 'SALARY_PAYMENT' },
        select: { id: true, amount: true, method: true },
      },
    },
  })
}

/** Get all active staff for selectors */
export async function getActiveStaffList() {
  await assertAdmin()
  return prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}
