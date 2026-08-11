import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingPricingService } from './BillingPricingService';

describe('BillingPricingService', () => {
  let pricingService: BillingPricingService;
  let mockInvoiceRepo: any;

  beforeEach(() => {
    mockInvoiceRepo = {
      findByInvoiceNumber: vi.fn(),
    };
    pricingService = new BillingPricingService(mockInvoiceRepo);
  });

  describe('calculateMultiplier', () => {
    it('should return 1 for monthly billing cycle', () => {
      expect(pricingService.calculateMultiplier('monthly')).toBe(1);
    });

    it('should return 9.6 (12 * 0.8) for annual billing cycle', () => {
      expect(pricingService.calculateMultiplier('annual')).toBe(9.6);
    });
  });

  describe('calculatePricing', () => {
    it('should calculate monthly pricing with 18% ITBIS tax correctly', () => {
      const result = pricingService.calculatePricing(100, 2, 'monthly');
      expect(result.subtotal).toBe(200);
      expect(result.tax).toBe(36);
      expect(result.total).toBe(236);
    });

    it('should calculate annual pricing with 20% discount and tax correctly', () => {
      // Unit price: 100, Equipment count: 1, Annual multiplier: 9.6
      // Subtotal = 100 * 9.6 * 1 = 960
      // Tax = 960 * 0.18 = 172.8
      // Total = 960 + 172.8 = 1132.8
      const result = pricingService.calculatePricing(100, 1, 'annual');
      expect(result.subtotal).toBe(960);
      expect(result.tax).toBe(172.8);
      expect(result.total).toBe(1132.8);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate a unique invoice number format (INV-YYYY-XXXXXX)', async () => {
      mockInvoiceRepo.findByInvoiceNumber.mockResolvedValueOnce(null);

      const invoiceNum = await pricingService.generateInvoiceNumber();
      const currentYear = new Date().getFullYear();

      expect(invoiceNum).toMatch(new RegExp(`^INV-${currentYear}-\\d{6}$`));
      expect(mockInvoiceRepo.findByInvoiceNumber).toHaveBeenCalledTimes(1);
    });

    it('should retry if an invoice number collision occurs', async () => {
      mockInvoiceRepo.findByInvoiceNumber
        .mockResolvedValueOnce({ id: 'existing-inv' })
        .mockResolvedValueOnce(null);

      const invoiceNum = await pricingService.generateInvoiceNumber();
      expect(mockInvoiceRepo.findByInvoiceNumber).toHaveBeenCalledTimes(2);
      expect(invoiceNum).toBeDefined();
    });
  });
});
