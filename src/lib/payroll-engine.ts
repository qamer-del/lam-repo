/**
 * Payroll Engine — Pure Calculation Functions
 *
 * Business rules:
 *  - Official hours per day = configurable per employee (default 8)
 *  - Official working days per month = 26
 *  - Monthly official hours = officialDailyHours × 26
 *  - Hourly rate = baseSalary / (officialDailyHours × 26)
 *  - Friday: ALL worked hours count as overtime (regardless of amount)
 *  - Weekday: first N hours = official (N = officialDailyHours), remainder = overtime
 *  - Overtime rate = hourlyRate × overtimeMultiplier (default 1.5)
 *  - TARGET_SALARY: a top-up adjustment is computed separately (not classified as OT)
 */

export const OFFICIAL_WORKING_DAYS = 26
// Legacy constant kept for backward-compat; engine now uses officialDailyHours param
export const OFFICIAL_HOURS_PER_DAY = 8
export const MONTHLY_OFFICIAL_HOURS = 208 // 26 × 8

export type PayrollStrategy = 'STANDARD' | 'TARGET_SALARY'

export interface AttendanceDay {
  date: Date
  clockIn: Date
  clockOut: Date
  workedHours: number
  isFriday: boolean
  isHoliday: boolean
}

export interface PayrollBreakdown {
  // Hours
  officialHours: number      // Regular hours ≤ officialDailyHours/day, non-Friday
  overtimeHours: number      // Hours > officialDailyHours/day, non-Friday
  fridayHours: number        // All Friday worked hours

  // Rates
  hourlyRate: number
  overtimeHourRate: number
  overtimeMultiplier: number
  officialDailyHours: number

  // Earnings
  baseSalaryEarned: number       // Pro-rated basic salary
  overtimeAmount: number         // Regular OT pay
  fridayOvertimeAmount: number   // Friday OT pay
  targetSalaryAdjustment: number // Top-up for TARGET_SALARY strategy (not OT)
  safetyAllowance: number        // Fixed safety allowance (not pro-rated)
  transportAllowance: number
  otherAllowance: number
  bonus: number
  totalEarnings: number

  // Deductions
  advancesTotal: number
  otherDeductions: number
  absenceDeduction: number
  totalDeductions: number

  // Net
  netSalary: number

  // Period info
  settlementDays: number
  monthTotalDays: number
  isFullMonth: boolean

  // Mode / Strategy
  payrollMode: 'ATTENDANCE' | 'FIXED'
  payrollStrategy: PayrollStrategy
}

/**
 * Determine if a date is a Friday
 */
export function isFridayDate(date: Date): boolean {
  return date.getDay() === 5 // 0=Sun, 5=Fri
}

/**
 * Calculate the hourly rate from basic salary and daily hours
 */
export function calcHourlyRate(baseSalary: number, officialDailyHours = 8): number {
  return baseSalary / (officialDailyHours * OFFICIAL_WORKING_DAYS)
}

/**
 * Calculate overtime hourly rate
 */
export function calcOvertimeRate(hourlyRate: number, multiplier: number): number {
  return hourlyRate * multiplier
}

/**
 * Process a single day's attendance and classify hours
 */
export function classifyDayHours(
  day: AttendanceDay,
  officialDailyHours = 8
): {
  officialHours: number
  overtimeHours: number
  fridayHours: number
} {
  const worked = Math.max(0, day.workedHours)

  if (day.isHoliday || day.isFriday) {
    // All hours on Friday/holiday = overtime
    return { officialHours: 0, overtimeHours: 0, fridayHours: worked }
  }

  const official = Math.min(worked, officialDailyHours)
  const overtime = Math.max(0, worked - officialDailyHours)
  return { officialHours: official, overtimeHours: overtime, fridayHours: 0 }
}

/**
 * Aggregate attendance records into hour totals
 */
export function aggregateAttendance(
  records: AttendanceDay[],
  officialDailyHours = 8
): {
  officialHours: number
  overtimeHours: number
  fridayHours: number
} {
  let officialHours = 0
  let overtimeHours = 0
  let fridayHours = 0

  for (const day of records) {
    const cls = classifyDayHours(day, officialDailyHours)
    officialHours += cls.officialHours
    overtimeHours += cls.overtimeHours
    fridayHours += cls.fridayHours
  }

  return {
    officialHours: round2(officialHours),
    overtimeHours: round2(overtimeHours),
    fridayHours: round2(fridayHours),
  }
}

/**
 * Pro-rate the basic salary for a partial month
 * Uses Saudi Labor Law daily-rate method
 */
export function calcProRatedSalary(
  baseSalary: number,
  settlementDays: number,
  totalDaysInMonth: number
): number {
  if (settlementDays >= totalDaysInMonth) return baseSalary
  return round2((baseSalary / totalDaysInMonth) * settlementDays)
}

/**
 * Calculate the number of days in a settlement period
 */
export function calcSettlementDays(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / msPerDay) + 1)
}

/**
 * Get total calendar days in a given month/year
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Main payroll breakdown calculator
 */
export function calcPayrollBreakdown(params: {
  attendanceRecords: AttendanceDay[]
  baseSalary: number
  safetyAllowance: number
  transportAllowance: number
  otherAllowance: number
  overtimeMultiplier: number
  bonus: number
  advancesTotal: number
  otherDeductions: number
  absenceDeduction: number
  settlementFrom: Date
  settlementTo: Date
  month: number
  year: number
  payrollMode?: 'ATTENDANCE' | 'FIXED'
  payrollStrategy?: PayrollStrategy
  targetSalary?: number
  useAttendance?: boolean       // Per-employee attendance toggle
  officialDailyHours?: number   // Configurable daily threshold (default 8)
}): PayrollBreakdown {
  const {
    attendanceRecords,
    baseSalary,
    safetyAllowance,
    transportAllowance,
    otherAllowance,
    overtimeMultiplier,
    bonus,
    advancesTotal,
    otherDeductions,
    absenceDeduction,
    settlementFrom,
    settlementTo,
    month,
    year,
    payrollMode = 'ATTENDANCE',
    payrollStrategy = 'STANDARD',
    targetSalary = 0,
    useAttendance = true,
    officialDailyHours = 8,
  } = params

  // FIXED mode (global) or per-employee useAttendance=false → skip attendance
  const isFixed = payrollMode === 'FIXED' || !useAttendance

  // Hours aggregation (skipped when no attendance used)
  const { officialHours, overtimeHours, fridayHours } = isFixed
    ? { officialHours: 0, overtimeHours: 0, fridayHours: 0 }
    : aggregateAttendance(attendanceRecords, officialDailyHours)

  // Rates — use officialDailyHours for hourly rate calc
  const hourlyRate = calcHourlyRate(baseSalary, officialDailyHours)
  const overtimeHourRate = calcOvertimeRate(hourlyRate, overtimeMultiplier)

  // Period info
  const monthTotalDays = getDaysInMonth(month, year)
  const settlementDays = calcSettlementDays(settlementFrom, settlementTo)
  const isFullMonth = isFixed || settlementDays >= monthTotalDays

  // Earnings
  // In FIXED/no-attendance mode: always pay full baseSalary (never pro-rated)
  const baseSalaryEarned = isFixed
    ? baseSalary
    : calcProRatedSalary(baseSalary, settlementDays, monthTotalDays)
  const overtimeAmount = isFixed ? 0 : round2(overtimeHours * overtimeHourRate)
  const fridayOvertimeAmount = isFixed ? 0 : round2(fridayHours * overtimeHourRate)

  // TARGET_SALARY strategy: compute top-up adjustment (never negative, never OT)
  let targetSalaryAdjustment = 0
  if (payrollStrategy === 'TARGET_SALARY' && targetSalary > 0) {
    const baseEarningsWithoutBonus = baseSalaryEarned + safetyAllowance
    const adjustment = targetSalary - baseEarningsWithoutBonus
    targetSalaryAdjustment = round2(Math.max(0, adjustment))
  }

  const totalEarnings = round2(
    baseSalaryEarned +
    overtimeAmount +
    fridayOvertimeAmount +
    targetSalaryAdjustment +
    safetyAllowance +
    transportAllowance +
    otherAllowance +
    bonus
  )

  // Deductions
  const totalDeductions = round2(advancesTotal + otherDeductions + absenceDeduction)

  // Net
  const netSalary = round2(totalEarnings - totalDeductions)

  return {
    officialHours,
    overtimeHours,
    fridayHours,
    hourlyRate: round2(hourlyRate),
    overtimeHourRate: round2(overtimeHourRate),
    overtimeMultiplier,
    officialDailyHours,
    baseSalaryEarned,
    overtimeAmount,
    fridayOvertimeAmount,
    targetSalaryAdjustment,
    safetyAllowance,
    transportAllowance,
    otherAllowance,
    bonus,
    totalEarnings,
    advancesTotal,
    otherDeductions,
    absenceDeduction,
    totalDeductions,
    netSalary,
    settlementDays,
    monthTotalDays,
    isFullMonth,
    payrollMode,
    payrollStrategy,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
