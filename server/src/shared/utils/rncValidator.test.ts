import { describe, it, expect } from 'vitest';
import { isValidRnc, sanitizeRnc, formatRnc, validateCompanyRnc, validateCedulaRnc } from './rncValidator';

describe('rncValidator', () => {
  describe('sanitizeRnc', () => {
    it('strips dashes, spaces, dots and non-digits', () => {
      expect(sanitizeRnc('1-01-00001-5')).toBe('101000015');
      expect(sanitizeRnc('402-1234567-8')).toBe('40212345678');
      expect(sanitizeRnc(' 132.12345 6 ')).toBe('132123456');
      expect(sanitizeRnc(null)).toBe('');
      expect(sanitizeRnc(undefined)).toBe('');
    });
  });

  describe('validateCompanyRnc (9 digits)', () => {
    it('validates a known correct 9-digit company RNC (e.g. 101000015)', () => {
      // 101000015:
      // sum = 1*7 + 0*9 + 1*8 + 0*6 + 0*5 + 0*4 + 0*3 + 1*2 = 7 + 0 + 8 + 0 + 0 + 0 + 0 + 2 = 17
      // 17 % 11 = 6 -> checkDigit = 11 - 6 = 5. Last digit is 5 -> valid!
      expect(validateCompanyRnc('101000015')).toBe(true);
      expect(isValidRnc('1-01-00001-5')).toBe(true);
    });

    it('validates Velmar Technology SRL official RNC 1-32-23734-1', () => {
      expect(validateCompanyRnc('132237341')).toBe(true);
      expect(isValidRnc('1-32-23734-1')).toBe(true);
      expect(formatRnc('132237341')).toBe('1-32-23734-1');
    });

    it('rejects an invalid 9-digit company RNC', () => {
      expect(validateCompanyRnc('101000019')).toBe(false);
      expect(isValidRnc('1-01-00001-9')).toBe(false);
    });

    it('rejects invalid lengths', () => {
      expect(validateCompanyRnc('12345678')).toBe(false);
      expect(validateCompanyRnc('1234567890')).toBe(false);
    });
  });

  describe('validateCedulaRnc (11 digits)', () => {
    it('validates a known correct 11-digit Cédula (e.g. 00100000002)', () => {
      // 00100000002: sum from index 0..9 with weights [1,2,1,2,1,2,1,2,1,2] -> index 2 is '1'*1 = 1
      // sum = 1 -> check digit = (10 - (1 % 10)) % 10 = 9 or check digit calculation
      // Let's test with a computed valid cedula:
      // digits: 4020000000 -> 4*1=4, 0*2=0, 2*1=2, rest 0. sum = 6. check digit = 10 - 6 = 4.
      expect(validateCedulaRnc('40200000004')).toBe(true);
      expect(isValidRnc('402-0000000-4')).toBe(true);
    });

    it('rejects an invalid 11-digit Cédula', () => {
      expect(validateCedulaRnc('40200000009')).toBe(false);
      expect(isValidRnc('402-0000000-9')).toBe(false);
    });
  });

  describe('formatRnc', () => {
    it('formats 9-digit RNC correctly', () => {
      expect(formatRnc('101000015')).toBe('1-01-00001-5');
    });

    it('formats 11-digit Cédula correctly', () => {
      expect(formatRnc('40200000004')).toBe('402-0000000-4');
    });

    it('returns original when unrecognized length', () => {
      expect(formatRnc('12345')).toBe('12345');
      expect(formatRnc(null)).toBe('');
    });
  });
});
