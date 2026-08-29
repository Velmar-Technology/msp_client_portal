import { PlanRepository, planRepository } from '../repositories/PlanRepository';
import { SubscriptionRepository, subscriptionRepository } from '../repositories/SubscriptionRepository';
import { PaypalService, paypalService } from '@modules/billing';
import { BillingPricingService, billingPricingService } from '@modules/billing';
import { NotFoundError, ValidationError } from '@shared/errors';
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

/**
 * Domain service orchestrating PayPal payment integrations for subscriptions, recurring billing agreements,
 * checkout verification, and device quota upgrade transactions.
 *
 * @see BL-401 (Subscription Reactivation upon Payment)
 */
export class SubscriptionPaymentService {
  /**
   * Initializes SubscriptionPaymentService with plan, paypal, pricing, and subscription repositories.
   *
   * @param planRepo - Plan repository
   * @param paypalSvc - PayPal integration service
   * @param pricingSvc - Billing pricing calculation service
   * @param subscriptionRepo - Subscription repository
   */
  constructor(
    private planRepo: PlanRepository = planRepository,
    private paypalSvc: PaypalService = paypalService,
    private pricingSvc: BillingPricingService = billingPricingService,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository
  ) {}

  /**
   * Generates a PayPal checkout order for a new plan subscription or device quota upgrade.
   *
   * @param data - Target plan ID, equipment/device count, billing cycle, and optional current subscription ID for upgrades
   * @returns Object containing generated PayPal order ID
   * @throws {NotFoundError} When plan or current subscription is not found
   * @throws {ValidationError} When upgrade device count is not greater than existing count
   */
  async createPaypalOrderForSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
    currentSubscriptionId?: string;
  }): Promise<{ orderId: string }> {
    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw new NotFoundError('Plan not found');
    }

    const newEquipmentCount = data.equipmentCount ?? 1;
    const billingCycle = data.billingCycle || 'monthly';
    let total = 0;
    let description = '';

    if (data.currentSubscriptionId) {
      const currentSubscription = await this.subscriptionRepo.findById(data.currentSubscriptionId);
      if (!currentSubscription) {
        throw new NotFoundError('Current subscription not found');
      }
      const additionalCount = newEquipmentCount - currentSubscription.equipment_count;
      if (additionalCount <= 0) {
        throw new ValidationError('New equipment count must be greater than current count for an upgrade payment');
      }
      description = `Upgrade for ${planDetails.name} - Adding ${additionalCount} Equipment`;
      total = this.pricing.calculateUpgradePricing(planDetails.price, additionalCount, billingCycle).total;
    } else {
      total = this.pricing.calculatePricing(planDetails.price, newEquipmentCount, billingCycle).total;
      description = `${planDetails.name} Subscription - ${newEquipmentCount} Equipment (${billingCycle === 'annual' ? 'Annually' : 'Monthly'})`;
    }

    const referenceId = `SUB-${planDetails.id}-${Date.now()}`;
    const order = await this.paypal.createOrderForAmount(total, description, referenceId);
    return { orderId: order.id };
  }

  /**
   * Creates an automated recurring PayPal subscription agreement with return and cancel callback URLs.
   *
   * @param data - Target plan ID, equipment quantity, and billing cycle
   * @returns Subscription ID and customer approval link
   * @throws {NotFoundError} When plan is not found
   */
  async createPaypalSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
  }): Promise<{ subscriptionId: string; approveUrl: string }> {
    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw new NotFoundError('Plan not found');
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

  /**
   * Verifies and captures a PayPal order for a subscription, ensuring the paid amount matches expected plan total.
   *
   * @param paypalOrderId - PayPal order ID
   * @param expectedTotal - Expected dollar amount
   * @throws {ValidationError} When payment was not completed or paid amount does not match expected total
   * @see BL-401
   */
  async verifyPaypalOrderPayment(paypalOrderId: string, expectedTotal: number): Promise<void> {
    const order = await this.paypal.getOrder(paypalOrderId);
    if (order.status === 'APPROVED') {
      const capture = await this.paypal.captureOrder(paypalOrderId);
      order.status = capture.status;
    }

    if (order.status !== 'COMPLETED') {
      throw new ValidationError('PayPal payment was not completed');
    }

    const purchaseUnit = order.purchase_units?.[0];
    const paidAmount = Number(purchaseUnit?.amount?.value);
    if (isNaN(paidAmount) || Math.abs(paidAmount - expectedTotal) > 0.05) {
      throw new ValidationError(`Paid amount $${paidAmount} does not match expected subscription cost $${expectedTotal}`);
    }
  }

  /**
   * Verifies and captures a PayPal order for device upgrades, ensuring captured funds match expected difference.
   *
   * @param paypalOrderId - PayPal order ID
   * @param expectedUpgradeTotal - Expected incremental charge
   * @throws {ValidationError} When payment was not completed or amounts do not match
   */
  async verifyPaypalUpgradePayment(paypalOrderId: string, expectedUpgradeTotal: number): Promise<void> {
    const order = await this.paypal.getOrder(paypalOrderId);
    if (order.status === 'APPROVED') {
      const capture = await this.paypal.captureOrder(paypalOrderId);
      order.status = capture.status;
    }

    if (order.status !== 'COMPLETED') {
      throw new ValidationError('PayPal payment for device upgrade was not completed');
    }

    const purchaseUnit = order.purchase_units?.[0];
    const paidAmount = Number(purchaseUnit?.amount?.value);
    if (isNaN(paidAmount) || Math.abs(paidAmount - expectedUpgradeTotal) > 0.05) {
      throw new ValidationError(`Paid upgrade amount $${paidAmount} does not match expected upgrade cost $${expectedUpgradeTotal}`);
    }
  }
}

export const subscriptionPaymentService = new SubscriptionPaymentService();
