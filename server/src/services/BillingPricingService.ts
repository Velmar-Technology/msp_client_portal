import { TAX_RATE } from '../config/constants';
import { InvoiceRepository, invoiceRepository } from '../repositories/InvoiceRepository';

export interface BillingAmount {
  subtotal: number;
  tax: number;
  total: number;
}

export class BillingPricingService {
  constructor(private invoiceRepo: InvoiceRepository = invoiceRepository) {}

  calculateMultiplier(billingCycle: 'monthly' | 'annual' = 'monthly'): number {
    return billingCycle === 'annual' ? Math.round(12 * 0.8 * 100) / 100 : 1;
  }

  calculatePricing(unitPrice: number, equipmentCount = 1, billingCycle: 'monthly' | 'annual' = 'monthly'): BillingAmount {
    const multiplier = this.calculateMultiplier(billingCycle);
    const subtotal = Math.round(unitPrice * multiplier * equipmentCount * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  }

  calculateUpgradePricing(unitPrice: number, additionalEquipmentCount: number, billingCycle: 'monthly' | 'annual' = 'monthly'): BillingAmount {
    return this.calculatePricing(unitPrice, additionalEquipmentCount, billingCycle);
  }

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
