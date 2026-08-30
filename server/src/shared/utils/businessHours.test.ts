import { describe, it, expect } from 'vitest';
import {
  isDominicanHoliday,
  isBusinessDay,
  isWithinBusinessHours,
  getEffectiveSlaStartTime,
  calculateSlaDueDate,
  calculateElapsedBusinessMs,
} from './businessHours';

/**
 * Helper: creates a Date from AST wall-clock values.
 * AST = UTC-4, so 9:00 AM AST = 13:00 UTC.
 */
function astDate(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hours + 4, minutes, seconds));
}

describe('BusinessHours & SLA Calculation (Section 3.1 & 3.2)', () => {
  // ======================================================
  // isDominicanHoliday
  // ======================================================
  describe('isDominicanHoliday', () => {
    it('recognizes New Year\'s Day (Jan 1)', () => {
      expect(isDominicanHoliday(astDate(2026, 1, 1, 10))).toBe(true);
    });

    it('recognizes Día de la Altagracia (Jan 21)', () => {
      expect(isDominicanHoliday(astDate(2026, 1, 21, 10))).toBe(true);
    });

    it('recognizes Día de Duarte (Jan 26)', () => {
      expect(isDominicanHoliday(astDate(2026, 1, 26, 12))).toBe(true);
    });

    it('recognizes Independence Day (Feb 27)', () => {
      expect(isDominicanHoliday(astDate(2026, 2, 27, 9))).toBe(true);
    });

    it('recognizes Labor Day (May 1)', () => {
      expect(isDominicanHoliday(astDate(2026, 5, 1, 11))).toBe(true);
    });

    it('recognizes Día de la Restauración (Aug 16)', () => {
      expect(isDominicanHoliday(astDate(2026, 8, 16, 14))).toBe(true);
    });

    it('recognizes Día de las Mercedes (Sep 24)', () => {
      expect(isDominicanHoliday(astDate(2026, 9, 24, 10))).toBe(true);
    });

    it('recognizes Día de la Constitución (Nov 6)', () => {
      expect(isDominicanHoliday(astDate(2026, 11, 6, 15))).toBe(true);
    });

    it('recognizes Christmas Day (Dec 25)', () => {
      expect(isDominicanHoliday(astDate(2026, 12, 25, 12))).toBe(true);
    });

    it('recognizes Good Friday (Easter - 2 days) for 2026', () => {
      // Easter 2026 is April 5, so Good Friday is April 3
      expect(isDominicanHoliday(astDate(2026, 4, 3, 10))).toBe(true);
    });

    it('recognizes Corpus Christi (Easter + 60 days) for 2026', () => {
      // Easter 2026 is April 5, so Corpus Christi is June 4
      expect(isDominicanHoliday(astDate(2026, 6, 4, 10))).toBe(true);
    });

    it('returns false for a regular business day', () => {
      // Aug 31, 2026 is a Monday and not a holiday
      expect(isDominicanHoliday(astDate(2026, 8, 31, 10))).toBe(false);
    });

    it('returns false for a weekend day that is not a holiday', () => {
      // Jan 10, 2026 is a Saturday — not a holiday itself
      expect(isDominicanHoliday(astDate(2026, 1, 10, 10))).toBe(false);
    });
  });

  // ======================================================
  // isBusinessDay
  // ======================================================
  describe('isBusinessDay', () => {
    it('returns true for a regular weekday (Wednesday)', () => {
      // Sep 2, 2026 is a Wednesday
      expect(isBusinessDay(astDate(2026, 9, 2, 10))).toBe(true);
    });

    it('returns false for Saturday', () => {
      // Aug 29, 2026 is a Saturday
      expect(isBusinessDay(astDate(2026, 8, 29, 10))).toBe(false);
    });

    it('returns false for Sunday', () => {
      // Aug 30, 2026 is a Sunday
      expect(isBusinessDay(astDate(2026, 8, 30, 10))).toBe(false);
    });

    it('returns false for a weekday that is a national holiday', () => {
      // Feb 27, 2026 is Friday (Independence Day)
      expect(isBusinessDay(astDate(2026, 2, 27, 10))).toBe(false);
    });

    it('returns true for a weekday adjacent to a holiday', () => {
      // Feb 26, 2026 is a Thursday — not a holiday
      expect(isBusinessDay(astDate(2026, 2, 26, 10))).toBe(true);
    });
  });

  // ======================================================
  // isWithinBusinessHours
  // ======================================================
  describe('isWithinBusinessHours', () => {
    it('returns true at 9:00 AM AST on a business day', () => {
      expect(isWithinBusinessHours(astDate(2026, 9, 1, 9, 0))).toBe(true);
    });

    it('returns true at 3:59 PM AST on a business day', () => {
      expect(isWithinBusinessHours(astDate(2026, 9, 1, 15, 59))).toBe(true);
    });

    it('returns false at 4:00 PM AST (business hours end)', () => {
      expect(isWithinBusinessHours(astDate(2026, 9, 1, 16, 0))).toBe(false);
    });

    it('returns false at 8:59 AM AST (before business hours)', () => {
      expect(isWithinBusinessHours(astDate(2026, 9, 1, 8, 59))).toBe(false);
    });

    it('returns false on a Saturday even during business hours', () => {
      expect(isWithinBusinessHours(astDate(2026, 8, 29, 10, 0))).toBe(false);
    });

    it('returns false on a holiday even during business hours', () => {
      // Dec 25, 2026 is a Friday (Christmas)
      expect(isWithinBusinessHours(astDate(2026, 12, 25, 10, 0))).toBe(false);
    });
  });

  // ======================================================
  // getEffectiveSlaStartTime
  // ======================================================
  describe('getEffectiveSlaStartTime', () => {
    it('returns the submission time when submitted within business hours', () => {
      const submitted = astDate(2026, 9, 2, 11, 30); // Wed 11:30 AM AST
      const result = getEffectiveSlaStartTime(submitted);
      expect(result.getTime()).toBe(submitted.getTime());
    });

    it('defers to 9:00 AM same day when submitted at 7:15 AM on a business day', () => {
      const submitted = astDate(2026, 9, 1, 7, 15); // Tue 7:15 AM AST
      const result = getEffectiveSlaStartTime(submitted);
      const expected = astDate(2026, 9, 1, 9, 0);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('defers to next business day 9:00 AM when submitted at 6:30 PM on a business day', () => {
      const submitted = astDate(2026, 8, 31, 18, 30); // Mon 6:30 PM AST
      const result = getEffectiveSlaStartTime(submitted);
      const expected = astDate(2026, 9, 1, 9, 0); // Tue 9:00 AM AST
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('defers to Monday 9:00 AM when submitted on Friday at 5:00 PM', () => {
      // Aug 28, 2026 is a Friday
      const submitted = astDate(2026, 8, 28, 17, 0);
      const result = getEffectiveSlaStartTime(submitted);
      // Aug 31 is Monday
      const expected = astDate(2026, 8, 31, 9, 0);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('defers to Monday 9:00 AM when submitted on Sunday at 2:00 PM', () => {
      // Aug 30, 2026 is a Sunday
      const submitted = astDate(2026, 8, 30, 14, 0);
      const result = getEffectiveSlaStartTime(submitted);
      const expected = astDate(2026, 8, 31, 9, 0); // Monday
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('defers to Monday 9:00 AM when submitted on Saturday at 10:00 AM', () => {
      // Aug 29, 2026 is a Saturday
      const submitted = astDate(2026, 8, 29, 10, 0);
      const result = getEffectiveSlaStartTime(submitted);
      const expected = astDate(2026, 8, 31, 9, 0); // Monday
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('defers past a holiday to the next business day', () => {
      // Dec 24, 2026 is a Thursday, Dec 25 is Christmas (Friday)
      const submitted = astDate(2026, 12, 24, 17, 0); // Thu 5:00 PM
      const result = getEffectiveSlaStartTime(submitted);
      // Dec 25 is holiday, Dec 26 is Saturday, Dec 27 is Sunday → Dec 28 is Monday
      const expected = astDate(2026, 12, 28, 9, 0);
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('defers past Independence Day (Feb 27) to the next business day', () => {
      // Feb 27, 2026 is Friday (Independence Day)
      const submitted = astDate(2026, 2, 27, 10, 0);
      const result = getEffectiveSlaStartTime(submitted);
      // Feb 28 is Saturday, Mar 1 is Sunday → Mar 2 is Monday
      const expected = astDate(2026, 3, 2, 9, 0);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  // ======================================================
  // calculateSlaDueDate
  // ======================================================
  describe('calculateSlaDueDate', () => {
    it('adds 1 SLA hour entirely within the same business day', () => {
      const submitted = astDate(2026, 9, 1, 10, 0); // Tue 10:00 AM
      const due = calculateSlaDueDate(submitted, 1);
      const expected = astDate(2026, 9, 1, 11, 0); // Tue 11:00 AM
      expect(due.getTime()).toBe(expected.getTime());
    });

    it('adds 2 SLA hours starting at 3:00 PM, rolling over to next business day', () => {
      const submitted = astDate(2026, 9, 1, 15, 0); // Tue 3:00 PM (1h remains today)
      const due = calculateSlaDueDate(submitted, 2);
      // 1h today (15→16), 1h next day (9→10)
      const expected = astDate(2026, 9, 2, 10, 0); // Wed 10:00 AM
      expect(due.getTime()).toBe(expected.getTime());
    });

    it('projects a 4h SLA submitted at 3:00 PM Friday across the weekend', () => {
      // Aug 28, 2026 is Friday
      const submitted = astDate(2026, 8, 28, 15, 0); // Fri 3:00 PM (1h left)
      const due = calculateSlaDueDate(submitted, 4);
      // 1h Friday (15→16), skip Sat/Sun, 3h Monday (9→12)
      const expected = astDate(2026, 8, 31, 12, 0); // Mon 12:00 PM
      expect(due.getTime()).toBe(expected.getTime());
    });

    it('projects an 8h SLA (> 1 business day) from a morning submission', () => {
      const submitted = astDate(2026, 9, 1, 9, 0); // Tue 9:00 AM
      const due = calculateSlaDueDate(submitted, 8);
      // 7h Tue (9→16), 1h Wed (9→10)
      const expected = astDate(2026, 9, 2, 10, 0); // Wed 10:00 AM
      expect(due.getTime()).toBe(expected.getTime());
    });

    it('handles after-hours submission by deferring SLA start', () => {
      const submitted = astDate(2026, 8, 31, 22, 0); // Mon 10:00 PM
      const due = calculateSlaDueDate(submitted, 1);
      // SLA starts Tue 9:00 AM, 1h → Tue 10:00 AM
      const expected = astDate(2026, 9, 1, 10, 0);
      expect(due.getTime()).toBe(expected.getTime());
    });

    it('handles a weekend submission with a multi-day SLA', () => {
      // Aug 29, 2026 is Saturday
      const submitted = astDate(2026, 8, 29, 10, 0);
      const due = calculateSlaDueDate(submitted, 14); // 14 business hours = 2 full days
      // SLA starts Mon 9:00 AM, 7h Mon (9→16), 7h Tue (9→16)
      const expected = astDate(2026, 9, 1, 16, 0); // Tue 4:00 PM
      expect(due.getTime()).toBe(expected.getTime());
    });
  });

  // ======================================================
  // calculateElapsedBusinessMs
  // ======================================================
  describe('calculateElapsedBusinessMs', () => {
    it('returns exact elapsed time when both start and end are within the same business day', () => {
      const start = astDate(2026, 9, 1, 9, 0);
      const end = astDate(2026, 9, 1, 11, 30);
      const elapsed = calculateElapsedBusinessMs(start, end);
      expect(elapsed).toBe(2.5 * 60 * 60 * 1000); // 2h30m
    });

    it('returns 0 when the end is before the effective SLA start', () => {
      const start = astDate(2026, 9, 1, 7, 0); // Before business hours
      const end = astDate(2026, 9, 1, 8, 0);   // Still before
      const elapsed = calculateElapsedBusinessMs(start, end);
      expect(elapsed).toBe(0);
    });

    it('counts only business hours across a weekend gap', () => {
      // Friday 3:00 PM → Monday 10:00 AM
      const start = astDate(2026, 8, 28, 15, 0); // Fri 3:00 PM
      const end = astDate(2026, 8, 31, 10, 0);   // Mon 10:00 AM
      const elapsed = calculateElapsedBusinessMs(start, end);
      // Fri 15→16 = 1h, skip Sat/Sun, Mon 9→10 = 1h → 2h total
      expect(elapsed).toBe(2 * 60 * 60 * 1000);
    });

    it('counts business hours across a holiday', () => {
      // Thu Dec 24 3:30 PM → Mon Dec 28 10:00 AM (Dec 25 = Christmas, holiday)
      const start = astDate(2026, 12, 24, 15, 30); // Thu 3:30 PM
      const end = astDate(2026, 12, 28, 10, 0);    // Mon 10:00 AM
      const elapsed = calculateElapsedBusinessMs(start, end);
      // Thu 15:30→16:00 = 30m, Dec 25 holiday, Dec 26 Sat, Dec 27 Sun, Mon 9→10 = 1h → 1h30m total
      expect(elapsed).toBe(1.5 * 60 * 60 * 1000);
    });

    it('defers SLA start for after-hours ticket creation', () => {
      const start = astDate(2026, 8, 31, 22, 0); // Mon 10:00 PM
      const end = astDate(2026, 9, 1, 11, 0);    // Tue 11:00 AM
      const elapsed = calculateElapsedBusinessMs(start, end);
      // SLA starts Tue 9:00 AM, end Tue 11:00 AM → 2h
      expect(elapsed).toBe(2 * 60 * 60 * 1000);
    });

    it('returns full 7 business hours for a complete business day span', () => {
      const start = astDate(2026, 9, 1, 9, 0);
      const end = astDate(2026, 9, 1, 16, 0);
      const elapsed = calculateElapsedBusinessMs(start, end);
      expect(elapsed).toBe(7 * 60 * 60 * 1000);
    });
  });
});
