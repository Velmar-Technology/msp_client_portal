import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { isValidRnc } from '@shared/utils/rncValidator';

/**
 * Domain service managing Dominican Tax Credit Invoice vouchers (NCF — Número de Comprobante Fiscal).
 *
 * Implements Section 9.2:
 * "THE COMPANY will issue Tax Credit Invoices (NCF) provided THE CLIENT supplies a valid RNC before the billing cycle cutoff."
 *
 * Uses DGII Series B01 (Factura de Crédito Fiscal) format: `B01` + 8 numeric digits (11 characters total).
 *
 * @see Section 9.2 (NCF Issuance)
 */
export class NcfService {
  /**
   * Initializes NcfService with InvoiceRepository dependency.
   *
   * @param invoiceRepo - Invoice repository
   */
  constructor(private invoiceRepo: InvoiceRepository = invoiceRepository) {}

  /**
   * Validates whether a given string is a syntactically valid Dominican NCF.
   * Standard Series B01: `B01` followed by 8 numeric digits (e.g. `B0100000001`).
   * Electronic Series E31: `E31` followed by 10 numeric digits.
   *
   * @param ncf - NCF voucher string
   * @returns True if valid NCF pattern
   */
  isValidNcf(ncf: string | null | undefined): boolean {
    if (!ncf) return false;
    return /^B01\d{8}$/.test(ncf) || /^E31\d{10}$/.test(ncf);
  }

  /**
   * Evaluates if a client is eligible for a Tax Credit Invoice (NCF) based on supplying a valid RNC.
   *
   * @param rnc - Client / Organization RNC or Cédula string
   * @returns True if client has a verified valid RNC
   */
  shouldIssueNcf(rnc: string | null | undefined): boolean {
    return isValidRnc(rnc);
  }

  /**
   * Generates the next sequential, collision-free Dominican Tax Credit NCF number (Series B01).
   *
   * @returns Generated NCF voucher string (e.g. `B0100000001`)
   */
  async generateNextNcf(): Promise<string> {
    const latestNcf = await this.invoiceRepo.findLatestNcf();
    let nextSeq = 1;

    if (latestNcf && latestNcf.startsWith('B01')) {
      const seqStr = latestNcf.slice(3);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        nextSeq = parsed + 1;
      }
    }

    while (true) {
      const candidate = `B01${String(nextSeq).padStart(8, '0')}`;
      const existing = await this.invoiceRepo.findByNcf(candidate);
      if (!existing) {
        return candidate;
      }
      nextSeq++;
    }
  }

  /**
   * Automatically allocates an NCF if the client/tenant has provided a valid RNC.
   *
   * @param rnc - Target RNC string
   * @returns Next NCF string if eligible, or null if no valid RNC provided
   */
  async assignNcfIfEligible(rnc: string | null | undefined): Promise<string | null> {
    if (!this.shouldIssueNcf(rnc)) {
      return null;
    }
    return this.generateNextNcf();
  }
}

export const ncfService = new NcfService();
