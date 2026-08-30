/**
 * Dominican Republic National Taxpayer Registry (RNC / Cédula) validator and formatting utility.
 *
 * Implements official DGII validation rules:
 * - 9-digit RNC for juridical entities / companies using modulo 11 checksum.
 * - 11-digit Cédula / RNC for natural persons using modulo 10 Luhn checksum.
 *
 * @see Section 9.2 (NCF Issuance & Valid RNC Requirement)
 */

/**
 * Strips formatting characters (dashes, spaces, dots) and extracts raw numeric digits.
 *
 * @param rnc - Raw input RNC or Cédula string
 * @returns Clean numeric string
 */
export function sanitizeRnc(rnc: string | null | undefined): string {
  if (!rnc) return '';
  return rnc.replace(/[^0-9]/g, '');
}

/**
 * Validates a 9-digit company / juridical RNC using the DGII Modulo 11 algorithm.
 *
 * @param cleanRnc - 9-digit numeric string
 * @returns True if valid checksum
 */
export function validateCompanyRnc(cleanRnc: string): boolean {
  if (!/^\d{9}$/.test(cleanRnc)) return false;

  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleanRnc[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let checkDigit: number;

  if (remainder === 0) {
    checkDigit = 2;
  } else if (remainder === 1) {
    checkDigit = 1;
  } else {
    checkDigit = 11 - remainder;
  }

  return parseInt(cleanRnc[8], 10) === checkDigit;
}

/**
 * Validates an 11-digit natural person Cédula / RNC using the DGII Modulo 10 Luhn algorithm.
 *
 * @param cleanCedula - 11-digit numeric string
 * @returns True if valid checksum
 */
export function validateCedulaRnc(cleanCedula: string): boolean {
  if (!/^\d{11}$/.test(cleanCedula)) return false;

  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    const digit = parseInt(cleanCedula[i], 10);
    const prod = digit * weights[i];
    sum += prod >= 10 ? Math.floor(prod / 10) + (prod % 10) : prod;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return parseInt(cleanCedula[10], 10) === checkDigit;
}

/**
 * Validates whether an RNC or Cédula string is well-formed and matches DGII verification standards.
 *
 * @param rnc - Raw or formatted RNC / Cédula string
 * @returns True if valid 9-digit company RNC or 11-digit person Cédula
 */
export function isValidRnc(rnc: string | null | undefined): boolean {
  const clean = sanitizeRnc(rnc);
  if (clean.length === 9) {
    return validateCompanyRnc(clean);
  }
  if (clean.length === 11) {
    return validateCedulaRnc(clean);
  }
  return false;
}

/**
 * Formats a clean RNC string into standard visual display format:
 * - 9 digits: `X-XX-XXXXX-X` or `XXX-XXXXX-X` (standard: `1-32-12345-6` or `101-12345-6`)
 * - 11 digits: `XXX-XXXXXXX-X` (`402-1234567-8`)
 *
 * @param rnc - Raw or sanitized RNC string
 * @returns Standard formatted display string, or original if unrecognized length
 */
export function formatRnc(rnc: string | null | undefined): string {
  const clean = sanitizeRnc(rnc);
  if (clean.length === 9) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 3)}-${clean.slice(3, 8)}-${clean.slice(8)}`;
  }
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`;
  }
  return rnc || '';
}
