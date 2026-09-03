import api from '@/services/api';

export interface Subscription {
  id: string;
  client_id: string;
  service_name: string;
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM' | string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CANCELLED' | string;
  renewal_date: string;
  equipment_count: number;
  paypal_order_id?: string;
  created_at: string;
}

/**
 * ADR-002: Client subscription management and recurring billing integration service.
 * Handles subscription provisioning, PayPal order/plan integration, and status updates.
 */
export const subscriptionService = {
  /**
   * Retrieves all subscriptions for the current client tenant.
   *
   * @returns Promise resolving to array of Subscription entities.
   */
  async getAll(): Promise<Subscription[]> {
    const response = await api.get('/subscriptions');
    return response.data.data;
  },

  /**
   * Provisions a new recurring client subscription.
   *
   * @see BL-402 (Renewal Scheduler)
   * @param data - Subscription parameters (serviceName, plan, equipmentCount, clientId, billingCycle, paypalOrderId, paymentMethod).
   * @returns Promise resolving to created Subscription entity.
   */
  async create(data: {
    serviceName: string;
    plan: string;
    equipmentCount: number;
    clientId?: string;
    billingCycle?: 'monthly' | 'annual';
    paypalOrderId?: string;
    paymentMethod?: 'card' | 'transfer';
  }): Promise<Subscription> {
    const response = await api.post('/subscriptions', data);
    return response.data.data;
  },

  /**
   * Creates a one-time PayPal order for subscription initiation or modification.
   *
   * @param data - Plan tier, device equipment count, billing cycle, and optional current subscription ID.
   * @returns Promise resolving to PayPal order identifier.
   */
  async createPaypalOrder(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
    currentSubscriptionId?: string;
  }): Promise<{ orderId: string }> {
    const response = await api.post('/subscriptions/paypal-order', data);
    return response.data.data;
  },

  /**
   * Initiates a recurring automated PayPal subscription agreement.
   *
   * @param data - Plan tier, device equipment count, and billing cycle.
   * @returns Promise resolving to subscriptionId and PayPal approval URL.
   */
  async createPaypalSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
  }): Promise<{ subscriptionId: string; approveUrl: string }> {
    const response = await api.post('/subscriptions/paypal-subscription', data);
    return response.data.data;
  },

  /**
   * Modifies an active subscription (changing plan tier, adjusting device count, or changing status).
   *
   * @see BL-401 (Subscription Reactivation)
   * @param id - Subscription UUID.
   * @param data - Updated subscription attributes.
   * @returns Promise resolving to updated Subscription entity.
   */
  async update(
    id: string,
    data: { plan?: string; equipmentCount?: number; status?: string; paypalOrderId?: string }
  ): Promise<Subscription> {
    const response = await api.patch(`/subscriptions/${id}`, data);
    return response.data.data;
  },
};

export default subscriptionService;
