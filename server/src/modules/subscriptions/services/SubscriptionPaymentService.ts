import { PlanRepository, planRepository } from '@modules/subscriptions/repositories/PlanRepository';
import { PaypalService, paypalService } from '@modules/billing';
import { BillingPricingService, billingPricingService } from '@modules/billing';
import { AppError } from '@shared/utils/AppError';
import { env } from '@shared/config/env';

function getLocalizedValue(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.en_US) return val.en_US;
  if (val.es_DO) return val.es_DO;
  const keys = Object.keys(val);
  if (keys.length > 0) return val[keys[0]];
  return '';
}

export class SubscriptionPaymentService {
  constructor(
    private planRepo: PlanRepository = planRepository,
    private paypalSvc: PaypalService = paypalService,
    private pricingSvc: BillingPricingService = billingPricingService
  ) {}

  async createPaypalOrderForSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
    currentSubscriptionId?: string;
  }): Promise<{ orderId: string }> {
    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const price = planDetails.price;
    const equipmentCount = data.equipmentCount ?? 1;
    const billingCycle = data.billingCycle || 'monthly';
    let total = 0;
    let description = '';

    if (data.currentSubscriptionId) {
      const additionalCount = equipmentCount - data.equipmentCount;
      if (additionalCount <= 0) {
        throw AppError.badRequest('New equipment count must be greater than current count for an upgrade payment');
      }
      description = `Upgrade for ${planDetails.name} - Adding ${additionalCount} Equipment`;
      total = this.pricing.calculateUpgradePricing(price, additionalCount, billingCycle).total;
    } else {
      total = this.pricing.calculatePricing(price, equipmentCount, billingCycle).total;
      description = `${planDetails.name} Subscription - ${equipmentCount} Equipment (${billingCycle === 'annual' ? 'Annually' : 'Monthly'})`;
    }

    const referenceId = `SUB-${planDetails.id}-${Date.now()}`;
    const order = await this.paypal.createOrderForAmount(total, description, referenceId);
    return { orderId: order.id };
  }

  async createPaypalSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
  }): Promise<{ subscriptionId: string; approveUrl: string }> {
    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const billingCycle = data.billingCycle || 'monthly';
    const equipmentCount = data.equipmentCount ?? 1;

    await this.paypal.createProduct(
      'MSP Helpdesk Support Service',
      'Premium technical support and device slots monitoring service'
    );

    let paypalPlanId = billingCycle === 'annual' ? planDetails.paypal_plan_id_annual : planDetails.paypal_plan_id_monthly;

    if (!paypalPlanId) {
      const price = planDetails.price;
      const unitPriceWithTax = this.pricing.calculatePricing(price, 1, billingCycle).total;

      const planName = `${getLocalizedValue(planDetails.name)} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`;
      const planDesc = `${getLocalizedValue(planDetails.description) || 'Recurring subscription plan'}`;

      paypalPlanId = await this.paypal.createPlan(
        'MSP-PLAN-SUPPORT',
        planName,
        planDesc,
        unitPriceWithTax,
        billingCycle
      );

      if (billingCycle === 'annual') {
        await this.planRepo.update(planDetails.id, { paypal_plan_id_annual: paypalPlanId });
      } else {
        await this.planRepo.update(planDetails.id, { paypal_plan_id_monthly: paypalPlanId });
      }
    }

    const returnUrl = `${env.CORS_ORIGIN}/plans?success=true`;
    const cancelUrl = `${env.CORS_ORIGIN}/plans?cancel=true`;

    const paypalSubscription = await this.paypal.createSubscription(
      paypalPlanId!,
      equipmentCount,
      returnUrl,
      cancelUrl
    );

    return {
      subscriptionId: paypalSubscription.id,
      approveUrl: paypalSubscription.approveUrl,
    };
  }

  private get paypal(): PaypalService {
    return this.paypalSvc || paypalService;
  }

  private get pricing(): BillingPricingService {
    return this.pricingSvc || billingPricingService;
  }

  async verifyPaypalOrderPayment(paypalOrderId: string, expectedTotal: number): Promise<void> {
    const order = await this.paypal.getOrder(paypalOrderId);
    if (order.status === 'APPROVED') {
      const capture = await this.paypal.captureOrder(paypalOrderId);
      order.status = capture.status;
    }

    if (order.status !== 'COMPLETED') {
      throw AppError.badRequest('PayPal payment was not completed');
    }

    const purchaseUnit = order.purchase_units?.[0];
    const paidAmount = Number(purchaseUnit?.amount?.value);
    if (isNaN(paidAmount) || Math.abs(paidAmount - expectedTotal) > 0.05) {
      throw AppError.badRequest(`Paid amount $${paidAmount} does not match expected subscription cost $${expectedTotal}`);
    }
  }

  async verifyPaypalUpgradePayment(paypalOrderId: string, expectedUpgradeTotal: number): Promise<void> {
    const order = await this.paypal.getOrder(paypalOrderId);
    if (order.status === 'APPROVED') {
      const capture = await this.paypal.captureOrder(paypalOrderId);
      order.status = capture.status;
    }

    if (order.status !== 'COMPLETED') {
      throw AppError.badRequest('PayPal payment for device upgrade was not completed');
    }

    const purchaseUnit = order.purchase_units?.[0];
    const paidAmount = Number(purchaseUnit?.amount?.value);
    if (isNaN(paidAmount) || Math.abs(paidAmount - expectedUpgradeTotal) > 0.05) {
      throw AppError.badRequest(`Paid upgrade amount $${paidAmount} does not match expected upgrade cost $${expectedUpgradeTotal}`);
    }
  }
}

export const subscriptionPaymentService = new SubscriptionPaymentService();
