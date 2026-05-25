/**
 * Payroll Engine — Pure Calculation Functions
 *
 * Business rules:
 *  - Official hours per day = 8
 *  - Official working days per month = 26
 *  - Monthly official hours = 208 (26 × 8)
 *  - Hourly rate = baseSalary / 208
 *  - Friday: ALL worked hours count as overtime (regardless of amount)
 *  - Weekday: first 8h = official, remainder = overtime
 *  - Overtime rate = hourlyRate × overtimeMultiplier (default 1.5)
 */

export const OFFICIAL_HOURS_PER_DAY = 8
export const OFFICIAL_WORKING_DAYS = 26
export const MONTHLY_OFFICIAL_HOURS = 208 // 26 × 8

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
  officialHours: number      // Regular hours ≤ 8h/day, non-Friday
  overtimeHours: number      // Hours > 8h/day, non-Friday
  fridayHours: number        // All Friday worked hours

  // Rates
  hourlyRate: number
  overtimeHourRate: number
  overtimeMultiplier: number

  // Earnings
  baseSalaryEarned: number   // Pro-rated basic salary
  overtimeAmount: number     // Regular OT pay
  fridayOvertimeAmount: number // Friday OT pay
  safetyAllowance: number    // Fixed safety allowance (not pro-rated)
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
}

/**
 * Determine if a date is a Friday
 */
export function isFridayDate(date: Date): boolean {
  return date.getDay() === 5 // 0=Sun, 5=Fri
}

/**
 * Calculate the hourly rate from basic salary
 */
export function calcHourlyRate(baseSalary: number): number {
  return baseSalary / MONTHLY_OFFICIAL_HOURS
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
export function classifyDayHours(day: AttendanceDay): {
  officialHours: number
  overtimeHours: number
  fridayHours: number
} {
  const worked = Math.max(0, day.workedHours)

  if (day.isHoliday || day.isFriday) {
    // All hours on Friday/holiday = overtime
    return { officialHours: 0, overtimeHours: 0, fridayHours: worked }
  }

  const official = Math.min(worked, OFFICIAL_HOURS_PER_DAY)
  const overtime = Math.max(0, worked - OFFICIAL_HOURS_PER_DAY)
  return { officialHours: official, overtimeHours: overtime, fridayHours: 0 }
}

/**
 * Aggregate attendance records into hour totals
 */
export function aggregateAttendance(records: AttendanceDay[]): {
  officialHours: number
  overtimeHours: number
  fridayHours: number
} {
  let officialHours = 0
  let overtimeHours = 0
  let fridayHours = 0

  for (const day of records) {
    const cls = classifyDayHours(day)
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
  } = params

  // Hours aggregation
  const { officialHours, overtimeHours, fridayHours } = aggregateAttendance(attendanceRecords)

  // Rates
  const hourlyRate = calcHourlyRate(baseSalary)
  const overtimeHourRate = calcOvertimeRate(hourlyRate, overtimeMultiplier)

  // Period info
  const monthTotalDays = getDaysInMonth(month, year)
  const settlementDays = calcSettlementDays(settlementFrom, settlementTo)
  const isFullMonth = settlementDays >= monthTotalDays

  // Earnings
  const baseSalaryEarned = calcProRatedSalary(baseSalary, settlementDays, monthTotalDays)
  const overtimeAmount = round2(overtimeHours * overtimeHourRate)
  const fridayOvertimeAmount = round2(fridayHours * overtimeHourRate)

  const totalEarnings = round2(
    baseSalaryEarned +
    overtimeAmount +
    fridayOvertimeAmount +
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
    baseSalaryEarned,
    overtimeAmount,
    fridayOvertimeAmount,
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
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
