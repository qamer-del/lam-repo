'use server'

import { prisma } from '@/lib/prisma'

/**
 * Lightweight overview data for the current month — used by the OverviewTab.
 * Avoids loading everything at once by scoping to a single employee + current month.
 */
export async function getOverviewData(staffId: number) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  const [unsettledTransactions, absenceRecords, attendanceRecords, lastSettlement] =
    await Promise.all([
      prisma.transaction.findMany({
        where: {
          staffId,
          isSettled: false,
          type: { in: ['ADVANCE', 'EXPENSE'] },
        },
        select: { amount: true, type: true },
      }),
      prisma.absenceRecord.findMany({
        where: { staffId, month, year },
        select: { hours: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { staffId, date: { gte: monthStart, lte: monthEnd } },
        select: { workedHours: true, isFriday: true },
      }),
      prisma.salarySettlement.findFirst({
        where: { staffId },
        orderBy: { paidAt: 'desc' },
        select: { paidAt: true, netPaid: true, month: true, year: true, settledUpToDate: true },
      }),
    ])

  const advancesTotal = unsettledTransactions
    .filter(t => t.type === 'ADVANCE')
    .reduce((s, t) => s + t.amount, 0)
  const deductionsTotal = unsettledTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0)
  const absenceHours = absenceRecords.reduce((s, r) => s + r.hours, 0)

  let officialHoursThisMonth = 0
  let overtimeHoursThisMonth = 0
  let fridayHoursThisMonth = 0
  for (const r of attendanceRecords) {
    if (r.isFriday) {
      fridayHoursThisMonth += r.workedHours
    } else {
      officialHoursThisMonth += Math.min(r.workedHours, 8)
      overtimeHoursThisMonth += Math.max(0, r.workedHours - 8)
    }
  }

  return {
    advancesTotal,
    deductionsTotal,
    totalUnsettled: advancesTotal + deductionsTotal,
    absenceHours,
    attendanceDays: attendanceRecords.length,
    officialHoursThisMonth: Math.round(officialHoursThisMonth * 100) / 100,
    overtimeHoursThisMonth: Math.round(overtimeHoursThisMonth * 100) / 100,
    fridayHoursThisMonth: Math.round(fridayHoursThisMonth * 100) / 100,
    lastSettlement,
  }
}
