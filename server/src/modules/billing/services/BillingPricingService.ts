import { TAX_RATE } from '@shared/config/constants';
import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';

export interface BillingAmount {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Domain service calculating billing cycle multipliers, tax, subtotals, upgrade costs, and unique invoice numbers.
 */
export class BillingPricingService {
  /**
   * Initializes BillingPricingService with InvoiceRepository dependency.
   *
   * @param invoiceRepo - Invoice repository
   */
  constructor(private invoiceRepo: InvoiceRepository = invoiceRepository) {}

  /**
   * Calculates the cycle multiplier (e.g. 1.0 for monthly, 9.6 for annual with 20% discount).
   *
   * @param billingCycle - 'monthly' or 'annual'
   * @returns Multiplier scalar
   */
  calculateMultiplier(billingCycle: 'monthly' | 'annual' = 'monthly'): number {
    return billingCycle === 'annual' ? Math.round(12 * 0.8 * 100) / 100 : 1;
  }

  /**
   * Computes subtotal, standard tax, and total pricing for given unit price and equipment count.
   *
   * @param unitPrice - Base unit price
   * @param equipmentCount - Number of hardware units/seats (default 1)
   * @param billingCycle - 'monthly' or 'annual'
   * @returns Breakdown containing subtotal, tax, and total
   */
  calculatePricing(unitPrice: number, equipmentCount = 1, billingCycle: 'monthly' | 'annual' = 'monthly'): BillingAmount {
    const multiplier = this.calculateMultiplier(billingCycle);
    const subtotal = Math.round(unitPrice * multiplier * equipmentCount * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  }

  /**
   * Computes pricing for additional equipment additions.
   *
   * @param unitPrice - Plan unit price
   * @param additionalEquipmentCount - Additional hardware units being added
   * @param billingCycle - 'monthly' or 'annual'
   * @returns Pricing breakdown
   */
  calculateUpgradePricing(unitPrice: number, additionalEquipmentCount: number, billingCycle: 'monthly' | 'annual' = 'monthly'): BillingAmount {
    return this.calculatePricing(unitPrice, additionalEquipmentCount, billingCycle);
  }

  /**
   * Generates a unique collision-free invoice number formatted as `INV-YYYY-XXXXXX`.
   *
   * @returns Unique invoice number string
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    while (true) {
      const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const invoiceNumber = `INV-${year}-${rand}`;
      const existing = await this.invoiceRepo.findByInvoiceNumber(invoiceNumber);
      if (!existing) {
        return invoiceNumber;
      }
    }
  }
}

export const billingPricingService = new BillingPricingService();
