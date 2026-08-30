// ============================================
// Business Hours & SLA Calculation Utilities
// ============================================
// Section 3.1 & 3.2 — Business Hours and SLA Calculation
// Timezone: America/Santo_Domingo (AST, UTC-4, no DST)

import { BUSINESS_HOURS_CONFIG } from '@shared/config/constants';

/** AST offset in milliseconds (UTC-4 = -4 hours) */
const AST_OFFSET_MS = -4 * 60 * 60 * 1000;

/**
 * Converts a Date to its AST (America/Santo_Domingo, UTC-4) wall-clock components.
 *
 * @param date - The UTC-aware Date instance
 * @returns Object with year, month (1-based), day, hours (0-23), minutes, seconds, and dayOfWeek (0=Sun)
 */
function toAstComponents(date: Date): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number;
} {
  const astMs = date.getTime() + AST_OFFSET_MS;
  const astDate = new Date(astMs);
  return {
    year: astDate.getUTCFullYear(),
    month: astDate.getUTCMonth() + 1,
    day: astDate.getUTCDate(),
    hours: astDate.getUTCHours(),
    minutes: astDate.getUTCMinutes(),
    seconds: astDate.getUTCSeconds(),
    dayOfWeek: astDate.getUTCDay(),
  };
}

/**
 * Constructs a UTC Date from AST wall-clock values.
 *
 * @param year - Full year
 * @param month - 1-based month
 * @param day - Day of month
 * @param hours - Hours (0-23 in AST)
 * @param minutes - Minutes
 * @param seconds - Seconds
 * @returns Date instance in UTC representing the given AST instant
 */
function fromAstComponents(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - AST_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Computes the Easter Sunday date for a given year using the Anonymous Gregorian algorithm.
 *
 * @param year - The calendar year
 * @returns Object with month (1-based) and day for Easter Sunday
 */
function computeEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Adds a number of calendar days to a given month/day within a year.
 *
 * @param year - Calendar year
 * @param month - 1-based month
 * @param day - Day of month
 * @param offset - Number of days to add (positive or negative)
 * @returns Object with adjusted month and day
 */
function addDays(year: number, month: number, day: number, offset: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + offset));
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Determines whether a given date falls on an official Dominican Republic national holiday.
 *
 * Covers both fixed holidays and movable holidays (Easter-relative).
 * Dominican "non-working" holidays per Law 139-97 and the national holiday calendar:
 *
 * **Fixed holidays:**
 * - Jan 1: Año Nuevo (New Year's Day)
 * - Jan 21: Día de la Altagracia (Our Lady of Altagracia)
 * - Jan 26: Día de Duarte (Duarte's Birthday)
 * - Feb 27: Día de la Independencia Nacional (Independence Day)
 * - May 1: Día del Trabajo (Labor Day)
 * - Aug 16: Día de la Restauración (Restoration Day)
 * - Sep 24: Día de las Mercedes (Our Lady of Mercedes)
 * - Nov 6: Día de la Constitución (Constitution Day)
 * - Dec 25: Navidad (Christmas Day)
 *
 * **Movable holidays (Easter-relative):**
 * - Good Friday (Easter Sunday - 2)
 * - Corpus Christi (Easter Sunday + 60)
 *
 * @param date - The date to evaluate
 * @returns True if the date is a Dominican Republic national holiday
 */
export function isDominicanHoliday(date: Date): boolean {
  const { year, month, day } = toAstComponents(date);

  // Fixed national holidays
  const fixedHolidays: Array<[number, number]> = [
    [1, 1],   // Año Nuevo
    [1, 21],  // Día de la Altagracia
    [1, 26],  // Día de Duarte
    [2, 27],  // Día de la Independencia Nacional
    [5, 1],   // Día del Trabajo
    [8, 16],  // Día de la Restauración
    [9, 24],  // Día de las Mercedes
    [11, 6],  // Día de la Constitución
    [12, 25], // Navidad
  ];

  for (const [hMonth, hDay] of fixedHolidays) {
    if (month === hMonth && day === hDay) return true;
  }

  // Movable holidays derived from Easter
  const easter = computeEasterSunday(year);

  // Good Friday: Easter Sunday - 2
  const goodFriday = addDays(year, easter.month, easter.day, -2);
  if (month === goodFriday.month && day === goodFriday.day) return true;

  // Corpus Christi: Easter Sunday + 60
  const corpusChristi = addDays(year, easter.month, easter.day, 60);
  if (month === corpusChristi.month && day === corpusChristi.day) return true;

  return false;
}

/**
 * Evaluates whether a given date falls on a business day (Monday–Friday, not a holiday).
 *
 * @param date - The date to evaluate
 * @returns True if the date is a weekday and not a Dominican Republic national holiday
 * @see Section 3.1
 */
export function isBusinessDay(date: Date): boolean {
  const { dayOfWeek } = toAstComponents(date);
  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  return !isDominicanHoliday(date);
}

/**
 * Checks whether the given date/time falls within active business hours
 * (9:00 AM – 4:00 PM AST on a business day).
 *
 * @param date - The date/time to evaluate
 * @returns True if within business hours
 * @see Section 3.1
 */
export function isWithinBusinessHours(date: Date): boolean {
  if (!isBusinessDay(date)) return false;
  const { hours, minutes } = toAstComponents(date);
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = BUSINESS_HOURS_CONFIG.startHour * 60;
  const endMinutes = BUSINESS_HOURS_CONFIG.endHour * 60;
  return totalMinutes >= startMinutes && totalMinutes < endMinutes;
}

/**
 * Returns the start of the next business day at 9:00 AM AST, advancing
 * forward from the given date, skipping weekends and holidays.
 *
 * @param date - The reference date to advance from
 * @returns Date at 9:00 AM AST on the next available business day
 */
function getNextBusinessDayStart(date: Date): Date {
  const ast = toAstComponents(date);
  // Start from next calendar day
  let candidate = fromAstComponents(ast.year, ast.month, ast.day + 1, BUSINESS_HOURS_CONFIG.startHour, 0, 0);
  // Advance until we find a business day (guard against infinite loop: max 30 iterations)
  for (let i = 0; i < 30; i++) {
    if (isBusinessDay(candidate)) return candidate;
    const c = toAstComponents(candidate);
    candidate = fromAstComponents(c.year, c.month, c.day + 1, BUSINESS_HOURS_CONFIG.startHour, 0, 0);
  }
  return candidate;
}

/**
 * Computes the effective SLA start time for a ticket submission per Section 3.2.
 *
 * - If submitted within business hours: SLA starts at the submission timestamp.
 * - If submitted before 9:00 AM AST on a business day: SLA starts at 9:00 AM that same day.
 * - If submitted after 4:00 PM AST, on a weekend, or on a holiday: SLA starts at 9:00 AM the next business day.
 *
 * @param submissionDate - The exact timestamp the ticket/request was submitted
 * @returns The effective Date when the SLA clock begins
 * @see Section 3.2
 */
export function getEffectiveSlaStartTime(submissionDate: Date): Date {
  if (isWithinBusinessHours(submissionDate)) {
    return submissionDate;
  }

  const ast = toAstComponents(submissionDate);

  // On a business day but before 9:00 AM → same day at 9:00 AM
  if (isBusinessDay(submissionDate) && ast.hours < BUSINESS_HOURS_CONFIG.startHour) {
    return fromAstComponents(ast.year, ast.month, ast.day, BUSINESS_HOURS_CONFIG.startHour, 0, 0);
  }

  // After 4:00 PM on a business day, or weekend/holiday → next business day at 9:00 AM
  return getNextBusinessDayStart(submissionDate);
}

/**
 * Calculates the SLA due date by projecting a number of SLA hours forward
 * across active business windows (7 business hours per day, 9:00 AM – 4:00 PM AST).
 *
 * @param submissionDate - The exact timestamp the ticket/request was submitted
 * @param slaHours - The SLA target in business hours (e.g. 1, 2, 4, 8)
 * @returns The projected Date when the SLA deadline expires
 * @see Section 3.2
 */
export function calculateSlaDueDate(submissionDate: Date, slaHours: number): Date {
  const effectiveStart = getEffectiveSlaStartTime(submissionDate);
  let remainingMs = slaHours * 60 * 60 * 1000;

  const ast = toAstComponents(effectiveStart);
  const dayEndMs = fromAstComponents(
    ast.year, ast.month, ast.day, BUSINESS_HOURS_CONFIG.endHour, 0, 0,
  ).getTime();

  // Business time remaining on the start day
  const remainingOnDay = dayEndMs - effectiveStart.getTime();

  if (remainingMs <= remainingOnDay) {
    return new Date(effectiveStart.getTime() + remainingMs);
  }

  remainingMs -= remainingOnDay;

  // Walk forward through subsequent business days
  let current = getNextBusinessDayStart(effectiveStart);
  const dailyMs = BUSINESS_HOURS_CONFIG.dailyHours * 60 * 60 * 1000;

  // Safety: max 365 iterations (1 year of potential holidays/weekends)
  for (let i = 0; i < 365; i++) {
    if (remainingMs <= dailyMs) {
      return new Date(current.getTime() + remainingMs);
    }
    remainingMs -= dailyMs;
    current = getNextBusinessDayStart(current);
  }

  // Fallback — should never reach here under normal circumstances
  return new Date(current.getTime() + remainingMs);
}

/**
 * Calculates the elapsed business milliseconds between two timestamps,
 * counting only time that falls within active business hours (9:00 AM – 4:00 PM AST, Mon-Fri, non-holiday).
 *
 * Used for SLA threshold evaluation (e.g. escalation) where only active working time should count.
 *
 * @param startDate - The SLA start timestamp (typically the ticket's `created_at`)
 * @param endDate - The measurement endpoint (defaults to `Date.now()`)
 * @returns Elapsed business time in milliseconds
 * @see Section 3.2
 * @see BL-104 (Tier Escalation)
 */
export function calculateElapsedBusinessMs(startDate: Date, endDate: Date = new Date()): number {
  const effectiveStart = getEffectiveSlaStartTime(startDate);

  if (endDate.getTime() <= effectiveStart.getTime()) {
    return 0;
  }

  let elapsed = 0;
  let cursor = effectiveStart;

  // Safety: max 365 day iterations
  for (let i = 0; i < 365; i++) {
    const cursorAst = toAstComponents(cursor);
    const dayEnd = fromAstComponents(
      cursorAst.year, cursorAst.month, cursorAst.day, BUSINESS_HOURS_CONFIG.endHour, 0, 0,
    );

    if (endDate.getTime() <= dayEnd.getTime()) {
      // endDate falls within this business day
      elapsed += endDate.getTime() - cursor.getTime();
      return elapsed;
    }

    // Count full remaining business time on this day
    elapsed += dayEnd.getTime() - cursor.getTime();

    // Advance to next business day start
    const nextStart = getNextBusinessDayStart(cursor);
    if (endDate.getTime() <= nextStart.getTime()) {
      return elapsed;
    }
    cursor = nextStart;
  }

  return elapsed;
}
