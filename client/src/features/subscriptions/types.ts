/**
 * Ephemeral UI types for the Subscriptions & Plans feature module per ADR-002.
 * Domain entity types MUST be imported from @shared/contracts.
 */

export type PlansTab = 'browse' | 'manage' | 'assign';
export type BillingCycle = 'monthly' | 'annual';
export type PaymentMethod = 'card' | 'transfer' | 'paypal';

export interface PlanCheckoutState {
  selectedPlanId: string | null;
  billingCycle: BillingCycle;
  equipmentCount: number;
  paymentMethod: PaymentMethod;
}

export interface PlanEditorFormTab {
  id: 'basic' | 'features' | 'pricing' | 'sla' | 'limits';
  label: string;
}
