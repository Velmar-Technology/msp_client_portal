import { describe, it, expect } from 'vitest';
import { subscriptionRenewalService, SubscriptionRenewalService } from '@modules/subscriptions';
import { billingPricingService, BillingPricingService, invoiceService, InvoiceService } from '@modules/billing';

describe('Module Gateway Circular Dependency Smoke Test', () => {
  it('instantiates subscriptionRenewalService singleton without undefined dependencies', () => {
    expect(subscriptionRenewalService).toBeDefined();
    expect(subscriptionRenewalService).toBeInstanceOf(SubscriptionRenewalService);

    // Verify that accessing the internal getters dynamically resolves without throwing
    const pricing = (subscriptionRenewalService as any).pricing;
    expect(pricing).toBeDefined();
    expect(typeof pricing.calculatePricing).toBe('function');

    const pricingResult = pricing.calculatePricing(100, 2, 'monthly');
    expect(pricingResult).toEqual({
      subtotal: 200,
      tax: 36,
      total: 236,
      currency: 'USD',
    });

    const ncf = (subscriptionRenewalService as any).ncf;
    expect(ncf).toBeDefined();
    expect(typeof ncf.assignNcfIfEligible).toBe('function');

    const invoiceRepo = (subscriptionRenewalService as any).invoiceRepository;
    expect(invoiceRepo).toBeDefined();
  });

  it('instantiates billing module singletons properly', () => {
    expect(billingPricingService).toBeDefined();
    expect(billingPricingService).toBeInstanceOf(BillingPricingService);
    expect(invoiceService).toBeDefined();
    expect(invoiceService).toBeInstanceOf(InvoiceService);
  });
});
