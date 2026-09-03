import { FEATURE_CATALOG, type FeatureCatalogItem } from "@/constants/featureCatalog";
import type { PlanFeature } from "@/features/subscriptions";

export interface PlanCostInput {
  features: PlanFeature[];
  equipmentCount?: number;
  billingCycle?: "monthly" | "annual";
  taxExempt?: boolean;
  ticketQuota?: number | null;
  slaTier?: {
    criticalMins?: number;
    highMins?: number;
    medMins?: number;
    lowMins?: number;
  };
  manualPriceOverride?: number;
  manualPerDevicePriceOverride?: number;
}

export interface PlanFeatureLineItem {
  code: string;
  name: string;
  included: boolean;
  baseMonthly: number;
  perDeviceMonthly: number;
  totalMonthly: number;
  details?: string;
}

export interface PlanCostResult {
  suggestedBasePrice: number;
  suggestedPerDevicePrice: number;
  effectiveBasePrice: number;
  effectivePerDevicePrice: number;
  equipmentCount: number;
  hardwareSubtotal: number;
  preDiscountSubtotal: number;
  annualDiscountAmount: number;
  netMonthlySubtotal: number;
  taxRate: number;
  taxAmount: number;
  monthlyGrandTotal: number;
  annualContractValue: number;
  lineItems: PlanFeatureLineItem[];
  slaPremiumMonthly: number;
  quotaAdjustmentMonthly: number;
}

/**
 * Calculates SLA speed premium based on response minutes.
 * Faster response times (<30m P1, <60m P2) demand higher operational readiness.
 */
export function calculateSlaPremium(slaTier?: PlanCostInput["slaTier"]): number {
  if (!slaTier) return 0;
  let premium = 0;
  const critical = Number(slaTier.criticalMins) || 15;
  const high = Number(slaTier.highMins) || 60;

  if (critical <= 15) {
    premium += 40; // VIP rapid triage tier
  } else if (critical <= 30) {
    premium += 20;
  }

  if (high <= 30) {
    premium += 25;
  } else if (high <= 60) {
    premium += 10;
  }

  return premium;
}

/**
 * Calculates quota capacity adjustment.
 * Unlimited quota adds baseline contingency for labor.
 */
export function calculateQuotaAdjustment(ticketQuota?: number | null): number {
  if (ticketQuota === null || ticketQuota === undefined) {
    return 30; // Unlimited quota baseline reserve
  }
  if (ticketQuota > 50) {
    return 20;
  }
  return 0;
}

/**
 * Pure calculation engine for MSP custom plans based on feature catalog pricing rules.
 *
 * @param input - Plan configuration including features, equipment count, SLA, and billing cycle.
 * @returns Complete financial breakdown with line items and suggested prices.
 */
export function calculatePlanCosts(input: PlanCostInput): PlanCostResult {
  const equipmentCount = Math.max(1, Number(input.equipmentCount) || 1);
  const billingCycle = input.billingCycle || "monthly";
  const taxExempt = Boolean(input.taxExempt);

  let rawCalculatedBase = 0;
  let rawCalculatedPerDevice = 0;
  const lineItems: PlanFeatureLineItem[] = [];

  for (const feature of input.features || []) {
    if (!feature.included) continue;

    const catalogItem: FeatureCatalogItem | undefined = FEATURE_CATALOG.find(
      (item) => item.code === feature.code,
    );

    let featBase = 0;
    let featPerDevice = 0;

    if (catalogItem?.pricingRule) {
      const rule = catalogItem.pricingRule;

      if (rule.computeCustomCost) {
        const customCost = rule.computeCustomCost(feature.params || {}, equipmentCount);
        featBase += customCost.baseMonthly || 0;
        featPerDevice += customCost.perDeviceMonthly || 0;
      } else {
        if (rule.baseMonthly !== undefined) {
          featBase += rule.baseMonthly;
        }
        if (rule.perDeviceMonthly !== undefined) {
          featPerDevice += rule.perDeviceMonthly;
        }

        if (rule.paramPricing && feature.params) {
          for (const [paramKey, paramVal] of Object.entries(feature.params)) {
            const strVal = String(paramVal);
            const valPricing = rule.paramPricing[paramKey]?.[strVal];
            if (valPricing) {
              if (valPricing.baseMonthly !== undefined) {
                featBase += valPricing.baseMonthly;
              }
              if (valPricing.perDeviceMonthly !== undefined) {
                featPerDevice += valPricing.perDeviceMonthly;
              }
            }
          }
        }
      }
    }

    const featureTotal = featBase + featPerDevice * equipmentCount;
    rawCalculatedBase += featBase;
    rawCalculatedPerDevice += featPerDevice;

    const featureName =
      catalogItem?.labelKey ||
      (typeof feature.text === "string"
        ? feature.text
        : feature.text?.en_US || feature.code || "Custom Deliverable");

    lineItems.push({
      code: feature.code || "CUSTOM_FEATURE",
      name: featureName,
      included: true,
      baseMonthly: Math.round(featBase * 100) / 100,
      perDeviceMonthly: Math.round(featPerDevice * 100) / 100,
      totalMonthly: Math.round(featureTotal * 100) / 100,
    });
  }

  const slaPremiumMonthly = calculateSlaPremium(input.slaTier);
  const quotaAdjustmentMonthly = calculateQuotaAdjustment(input.ticketQuota);

  // Suggested Baseline
  const suggestedBasePrice = Math.max(
    0,
    Math.round((rawCalculatedBase + slaPremiumMonthly + quotaAdjustmentMonthly) * 100) / 100,
  );
  const suggestedPerDevicePrice = Math.max(
    0,
    Math.round(rawCalculatedPerDevice * 100) / 100,
  );

  // Effective Prices (user overrides take precedence if explicitly supplied)
  const effectiveBasePrice =
    input.manualPriceOverride !== undefined && !isNaN(input.manualPriceOverride)
      ? Number(input.manualPriceOverride)
      : suggestedBasePrice;

  const effectivePerDevicePrice =
    input.manualPerDevicePriceOverride !== undefined &&
    !isNaN(input.manualPerDevicePriceOverride)
      ? Number(input.manualPerDevicePriceOverride)
      : suggestedPerDevicePrice;

  // Real-time financial calculations
  const hardwareSubtotal = effectivePerDevicePrice * equipmentCount;
  const preDiscountSubtotal = effectiveBasePrice + hardwareSubtotal;
  const annualDiscountAmount =
    billingCycle === "annual" ? Math.round(preDiscountSubtotal * 0.1 * 100) / 100 : 0;
  const netMonthlySubtotal = Math.max(0, preDiscountSubtotal - annualDiscountAmount);

  // 18% DGII ITBIS
  const taxRate = taxExempt ? 0 : 0.18;
  const taxAmount = Math.round(netMonthlySubtotal * taxRate * 100) / 100;
  const monthlyGrandTotal = Math.round((netMonthlySubtotal + taxAmount) * 100) / 100;
  const annualContractValue = Math.round(monthlyGrandTotal * 12 * 100) / 100;

  return {
    suggestedBasePrice,
    suggestedPerDevicePrice,
    effectiveBasePrice,
    effectivePerDevicePrice,
    equipmentCount,
    hardwareSubtotal: Math.round(hardwareSubtotal * 100) / 100,
    preDiscountSubtotal: Math.round(preDiscountSubtotal * 100) / 100,
    annualDiscountAmount,
    netMonthlySubtotal: Math.round(netMonthlySubtotal * 100) / 100,
    taxRate,
    taxAmount,
    monthlyGrandTotal,
    annualContractValue,
    lineItems,
    slaPremiumMonthly,
    quotaAdjustmentMonthly,
  };
}
