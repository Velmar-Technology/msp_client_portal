import { describe, it, expect } from "vitest";
import {
  calculatePlanCosts,
  calculateSlaPremium,
  calculateQuotaAdjustment,
} from "./planCostCalculator";
import type { PlanFeature } from "@/services/planService";

describe("planCostCalculator", () => {
  it("calculates SLA premiums correctly for rapid vs standard SLA", () => {
    expect(calculateSlaPremium({ criticalMins: 15, highMins: 30 })).toBe(65); // 40 + 25
    expect(calculateSlaPremium({ criticalMins: 60, highMins: 120 })).toBe(0);
    expect(calculateSlaPremium(undefined)).toBe(0);
  });

  it("calculates quota contingency adjustments", () => {
    expect(calculateQuotaAdjustment(null)).toBe(30); // unlimited
    expect(calculateQuotaAdjustment(undefined)).toBe(30);
    expect(calculateQuotaAdjustment(100)).toBe(20);
    expect(calculateQuotaAdjustment(10)).toBe(0);
  });

  it("calculates baseline costs for selected catalog features", () => {
    const features: PlanFeature[] = [
      {
        code: "HELPDESK_SUPPORT",
        included: true,
        params: { type: "8x5", limit: "Unlimited" },
      },
      {
        code: "EDR_SECURITY",
        included: true,
        params: { tier: "EDR with Auto-Remediation" },
      },
    ];

    const result = calculatePlanCosts({
      features,
      equipmentCount: 10,
      billingCycle: "monthly",
      ticketQuota: 20,
      slaTier: { criticalMins: 60, highMins: 120 },
    });

    // HELPDESK_SUPPORT (8x5): baseMonthly 60, perDevice 5
    // EDR_SECURITY (EDR with Auto-Remediation): perDevice 6
    // Total base = 60 + SLA(0) + Quota(0) = 60
    // Total perDevice = 5 + 6 = 11
    expect(result.suggestedBasePrice).toBe(60);
    expect(result.suggestedPerDevicePrice).toBe(11);
    expect(result.equipmentCount).toBe(10);
    expect(result.hardwareSubtotal).toBe(110);
    expect(result.preDiscountSubtotal).toBe(170); // 60 + 110
    expect(result.netMonthlySubtotal).toBe(170);
    expect(result.taxAmount).toBe(30.6); // 18% of 170
    expect(result.monthlyGrandTotal).toBe(200.6);
  });

  it("handles tax exemption correctly", () => {
    const features: PlanFeature[] = [
      {
        code: "HELPDESK_SUPPORT",
        included: true,
        params: { type: "8x5" },
      },
    ];

    const result = calculatePlanCosts({
      features,
      equipmentCount: 5,
      taxExempt: true,
      ticketQuota: 10,
      slaTier: { criticalMins: 60, highMins: 120 },
    });

    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.monthlyGrandTotal).toBe(result.netMonthlySubtotal);
  });

  it("applies 10% annual discount correctly", () => {
    const features: PlanFeature[] = [
      {
        code: "HELPDESK_SUPPORT",
        included: true,
        params: { type: "8x5" },
      },
    ];

    const result = calculatePlanCosts({
      features,
      equipmentCount: 10,
      billingCycle: "annual",
      ticketQuota: 10,
      slaTier: { criticalMins: 60, highMins: 120 },
    });

    // Base = 60, perDevice = 5 * 10 = 50. Pre-discount = 110
    expect(result.preDiscountSubtotal).toBe(110);
    expect(result.annualDiscountAmount).toBe(11); // 10% of 110
    expect(result.netMonthlySubtotal).toBe(99); // 110 - 11
  });

  it("respects manual price overrides", () => {
    const features: PlanFeature[] = [
      {
        code: "HELPDESK_SUPPORT",
        included: true,
        params: { type: "8x5" },
      },
    ];

    const result = calculatePlanCosts({
      features,
      equipmentCount: 5,
      manualPriceOverride: 250,
      manualPerDevicePriceOverride: 30,
    });

    expect(result.suggestedBasePrice).toBeGreaterThan(0);
    expect(result.effectiveBasePrice).toBe(250);
    expect(result.effectivePerDevicePrice).toBe(30);
    expect(result.hardwareSubtotal).toBe(150); // 30 * 5
  });

  it("ignores excluded features (included: false)", () => {
    const features: PlanFeature[] = [
      {
        code: "HELPDESK_SUPPORT",
        included: false,
        params: { type: "8x5" },
      },
    ];

    const result = calculatePlanCosts({
      features,
      equipmentCount: 1,
      ticketQuota: 10,
      slaTier: { criticalMins: 60, highMins: 120 },
    });

    expect(result.suggestedBasePrice).toBe(0);
    expect(result.suggestedPerDevicePrice).toBe(0);
    expect(result.lineItems).toHaveLength(0);
  });

  it("calculates dynamic storage costs for CLOUD_STORAGE", () => {
    const features: PlanFeature[] = [
      {
        code: "CLOUD_STORAGE",
        included: true,
        params: { limit: 125, unit: "GB" }, // 100GB extra @ $0.06 = +$6/dev
      },
    ];

    const result = calculatePlanCosts({
      features,
      equipmentCount: 2,
      ticketQuota: 10,
      slaTier: { criticalMins: 60, highMins: 120 },
    });

    // base: 10, perDevice: 1 + (125-25)*0.06 = 1 + 6 = 7
    expect(result.suggestedBasePrice).toBe(10);
    expect(result.suggestedPerDevicePrice).toBe(7);
  });
});
