// ============================================
// Client-Side Business Hours Utility
// ============================================
// Lightweight version of server-side businessHours.ts for UI awareness.
// Section 3.1 & 3.2 — Business Hours and SLA Calculation

/** AST offset in milliseconds (UTC-4) */
const AST_OFFSET_MS = -4 * 60 * 60 * 1000;

/** Business hours config matching server-side BUSINESS_HOURS_CONFIG */
const BUSINESS_HOURS = {
  startHour: 9,
  endHour: 16,
} as const;

/**
 * Converts a Date to AST wall-clock components.
 */
function toAstComponents(date: Date) {
  const astMs = date.getTime() + AST_OFFSET_MS;
  const astDate = new Date(astMs);
  return {
    year: astDate.getUTCFullYear(),
    month: astDate.getUTCMonth() + 1,
    day: astDate.getUTCDate(),
    hours: astDate.getUTCHours(),
    minutes: astDate.getUTCMinutes(),
    dayOfWeek: astDate.getUTCDay(),
  };
}

/**
 * Constructs a UTC Date from AST wall-clock values.
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
 * Computes Easter Sunday for a given year (Anonymous Gregorian algorithm).
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

function addDays(year: number, month: number, day: number, offset: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day + offset));
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Checks if a date is a Dominican Republic national holiday.
 */
export function isDominicanHoliday(date: Date): boolean {
  const { year, month, day } = toAstComponents(date);

  const fixedHolidays: Array<[number, number]> = [
    [1, 1], [1, 21], [1, 26], [2, 27], [5, 1],
    [8, 16], [9, 24], [11, 6], [12, 25],
  ];

  for (const [hMonth, hDay] of fixedHolidays) {
    if (month === hMonth && day === hDay) return true;
  }

  const easter = computeEasterSunday(year);
  const goodFriday = addDays(year, easter.month, easter.day, -2);
  if (month === goodFriday.month && day === goodFriday.day) return true;

  const corpusChristi = addDays(year, easter.month, easter.day, 60);
  if (month === corpusChristi.month && day === corpusChristi.day) return true;

  return false;
}

/**
 * Checks if a date is a business day (Mon-Fri, non-holiday).
 */
export function isBusinessDay(date: Date): boolean {
  const { dayOfWeek } = toAstComponents(date);
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  return !isDominicanHoliday(date);
}

/**
 * Checks if the given date/time is within active business hours (9 AM – 4 PM AST on a business day).
 */
export function isWithinBusinessHours(date: Date = new Date()): boolean {
  if (!isBusinessDay(date)) return false;
  const { hours, minutes } = toAstComponents(date);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= BUSINESS_HOURS.startHour * 60 && totalMinutes < BUSINESS_HOURS.endHour * 60;
}

/**
 * Returns the next business day start (9:00 AM AST) from the given date.
 */
function getNextBusinessDayStart(date: Date): Date {
  const ast = toAstComponents(date);
  let candidate = fromAstComponents(ast.year, ast.month, ast.day + 1, BUSINESS_HOURS.startHour, 0, 0);
  for (let i = 0; i < 30; i++) {
    if (isBusinessDay(candidate)) return candidate;
    const c = toAstComponents(candidate);
    candidate = fromAstComponents(c.year, c.month, c.day + 1, BUSINESS_HOURS.startHour, 0, 0);
  }
  return candidate;
}

/**
 * Computes the effective SLA start time per Section 3.2.
 *
 * - Within business hours → immediate
 * - Before 9 AM on a business day → 9:00 AM same day
 * - After 4 PM, weekend, or holiday → 9:00 AM next business day
 */
export function getEffectiveSlaStartTime(submissionDate: Date): Date {
  if (isWithinBusinessHours(submissionDate)) {
    return submissionDate;
  }

  const ast = toAstComponents(submissionDate);

  if (isBusinessDay(submissionDate) && ast.hours < BUSINESS_HOURS.startHour) {
    return fromAstComponents(ast.year, ast.month, ast.day, BUSINESS_HOURS.startHour, 0, 0);
  }

  return getNextBusinessDayStart(submissionDate);
}
