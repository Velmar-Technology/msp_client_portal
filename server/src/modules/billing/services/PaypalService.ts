import { env } from '@shared/config/env';
import { logger } from '@shared/utils/logger';
import { AppError } from '@shared/utils/AppError';
import { Invoice } from '@shared/types';

export class PaypalService {
  public get baseUrl(): string {
    if (env.PAYPAL_API_URL && env.PAYPAL_API_URL.trim() !== '') {
      return env.PAYPAL_API_URL.replace(/\/+$/, '');
    }
    const isSandbox = env.NODE_ENV !== 'production' || process.env.PAYPAL_MODE === 'sandbox';
    return isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  private isMockMode(): boolean {
    return !env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET;
  }

  /**
   * Retrieves an OAuth 2.0 access token from PayPal.
   */
  async getAccessToken(): Promise<string> {
    if (this.isMockMode()) {
      return 'mock-access-token';
    }

    try {
      const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal OAuth token retrieval failed', { status: response.status, errorText });
        throw AppError.internal('Failed to authenticate with PayPal');
      }

      const data = await response.json() as { access_token: string };
      return data.access_token;
    } catch (error) {
      logger.error('Error fetching PayPal access token', { error });
      throw AppError.internal('Failed to authenticate with PayPal');
    }
  }

  /**
   * Creates a PayPal checkout order for a specific invoice.
   */
  async createOrder(invoice: Invoice): Promise<{ id: string; status: string }> {
    if (this.isMockMode()) {
      const mockOrderId = `MOCK-PAYPAL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      logger.info(`[PayPal Mock] Created mock order ${mockOrderId} for Invoice ${invoice.invoice_number} (Total: $${invoice.total})`);
      return { id: mockOrderId, status: 'CREATED' };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: invoice.id,
              amount: {
                currency_code: 'USD',
                value: Number(invoice.total).toFixed(2),
              },
              description: `Invoice ${invoice.invoice_number} - Velmar Tech Helpdesk`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal order creation failed', { status: response.status, errorText });
        throw AppError.internal('Failed to create PayPal order');
      }

      const data = await response.json() as { id: string; status: string };
      return data;
    } catch (error) {
      logger.error('Error creating PayPal order', { error, invoiceId: invoice.id });
      throw AppError.internal('Failed to initiate PayPal payment');
    }
  }

  /**
   * Captures the payment for an authorized PayPal order.
   */
  async captureOrder(paypalOrderId: string): Promise<{ status: string; captureId?: string }> {
    if (this.isMockMode() || paypalOrderId.startsWith('MOCK-')) {
      logger.info(`[PayPal Mock] Captured mock order ${paypalOrderId}`);
      return { status: 'COMPLETED', captureId: `MOCK-CAP-${Math.random().toString(36).substring(2, 11).toUpperCase()}` };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal order capture failed', { status: response.status, errorText });
        throw AppError.internal('Failed to capture PayPal payment');
      }

      const data = await response.json() as {
        status: string;
        purchase_units?: Array<{
          payments?: {
            captures?: Array<{ id: string; status: string }>;
          };
        }>;
      };

      const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      return {
        status: data.status,
        captureId,
      };
    } catch (error) {
      logger.error('Error capturing PayPal order', { error, paypalOrderId });
      throw AppError.internal('Failed to finalize PayPal payment');
    }
  }

  async getOrder(paypalOrderId: string): Promise<{ id: string; status: string; purchase_units?: any }> {
    if (this.isMockMode() || paypalOrderId.startsWith('MOCK-')) {
      logger.info(`[PayPal Mock] Retrieved mock order ${paypalOrderId}`);
      return {
        id: paypalOrderId,
        status: 'COMPLETED',
        purchase_units: [
          {
            amount: {
              value: '100.00',
            },
          },
        ],
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal get order failed', { status: response.status, errorText });
        throw AppError.internal('Failed to retrieve PayPal order details');
      }

      const data = await response.json() as any;
      return data;
    } catch (error) {
      logger.error('Error retrieving PayPal order', { error, paypalOrderId });
      throw AppError.internal('Failed to retrieve PayPal payment status');
    }
  }

  async createOrderForAmount(amount: number, description: string, referenceId: string): Promise<{ id: string; status: string }> {
    if (this.isMockMode()) {
      const mockOrderId = `MOCK-PAYPAL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      logger.info(`[PayPal Mock] Created mock order ${mockOrderId} for Amount ${amount}`);
      return { id: mockOrderId, status: 'CREATED' };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: referenceId,
              amount: {
                currency_code: 'USD',
                value: amount.toFixed(2),
              },
              description,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal order creation failed', { status: response.status, errorText });
        throw AppError.internal('Failed to create PayPal order');
      }

      const data = await response.json() as { id: string; status: string };
      return data;
    } catch (error) {
      logger.error('Error creating PayPal order for amount', { error, amount });
      throw AppError.internal('Failed to initiate PayPal payment');
    }
  }

  async createProduct(name: string, description: string): Promise<string> {
    const productId = 'MSP-PLAN-SUPPORT';
    if (this.isMockMode()) {
      logger.info(`[PayPal Mock] Create Product ${productId}`);
      return productId;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: productId,
          name,
          description,
          type: 'SERVICE',
          category: 'COMPUTER_AND_DATA_PROCESSING_SERVICES',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 422 || errorText.includes('PRODUCT_ID_ALREADY_EXISTS') || errorText.includes('RESOURCE_ALREADY_EXISTS')) {
          logger.info(`PayPal product ${productId} already exists.`);
          return productId;
        }
        logger.error('PayPal product creation failed', { status: response.status, errorText });
        throw AppError.internal('Failed to create PayPal product');
      }

      logger.info(`PayPal product ${productId} created successfully.`);
      return productId;
    } catch (error) {
      logger.error('Error creating PayPal product', { error });
      throw AppError.internal('Failed to create PayPal product');
    }
  }

  async createPlan(productId: string, name: string, description: string, price: number, billingCycle: 'monthly' | 'annual'): Promise<string> {
    if (this.isMockMode()) {
      const mockPlanId = `MOCK-PLAN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      logger.info(`[PayPal Mock] Created mock plan ${mockPlanId} for price ${price} (${billingCycle})`);
      return mockPlanId;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/billing/plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          name,
          description,
          status: 'ACTIVE',
          billing_cycles: [
            {
              frequency: {
                interval_unit: billingCycle === 'annual' ? 'YEAR' : 'MONTH',
                interval_count: 1,
              },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: {
                fixed_price: {
                  value: price.toFixed(2),
                  currency_code: 'USD',
                },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: 'CANCEL',
            payment_failure_threshold: 1,
          },
          quantity_supported: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal billing plan creation failed', { status: response.status, errorText });
        throw AppError.internal('Failed to create PayPal billing plan');
      }

      const data = await response.json() as { id: string };
      logger.info(`PayPal billing plan ${data.id} created successfully.`);
      return data.id;
    } catch (error) {
      logger.error('Error creating PayPal plan', { error });
      throw AppError.internal('Failed to create PayPal billing plan');
    }
  }

  async createSubscription(paypalPlanId: string, quantity: number, returnUrl: string, cancelUrl: string): Promise<{ id: string; approveUrl: string }> {
    if (this.isMockMode() || paypalPlanId.startsWith('MOCK-')) {
      const mockSubId = `MOCK-SUB-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      logger.info(`[PayPal Mock] Created mock subscription ${mockSubId} for plan ${paypalPlanId} with quantity ${quantity}`);
      return {
        id: mockSubId,
        approveUrl: `${returnUrl}?subscription_id=${mockSubId}&mock_approve=true`,
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: paypalPlanId,
          quantity: quantity.toString(),
          application_context: {
            brand_name: 'Velmar Tech Helpdesk',
            locale: 'en-US',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal subscription creation failed', { status: response.status, errorText });
        throw AppError.internal('Failed to create PayPal subscription');
      }

      const data = await response.json() as { id: string; links?: Array<{ rel: string; href: string }> };
      const approveLink = data.links?.find((l) => l.rel === 'approve');
      if (!approveLink) {
        throw AppError.internal('PayPal approval link not found in response');
      }

      return {
        id: data.id,
        approveUrl: approveLink.href,
      };
    } catch (error) {
      logger.error('Error creating PayPal subscription', { error });
      throw AppError.internal('Failed to initiate PayPal subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<{ status: string; nextBillingTime: string }> {
    if (this.isMockMode() || subscriptionId.startsWith('MOCK-')) {
      logger.info(`[PayPal Mock] Get subscription details for ${subscriptionId}`);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return {
        status: 'ACTIVE',
        nextBillingTime: thirtyDaysFromNow.toISOString(),
      };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('PayPal get subscription details failed', { status: response.status, errorText });
        throw AppError.internal('Failed to retrieve PayPal subscription details');
      }

      const data = await response.json() as { status: string; billing_info?: { next_billing_time?: string } };
      return {
        status: data.status,
        nextBillingTime: data.billing_info?.next_billing_time || new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error retrieving PayPal subscription', { error, subscriptionId });
      throw AppError.internal('Failed to retrieve PayPal subscription status');
    }
  }

  async updateSubscriptionQuantity(subscriptionId: string, quantity: number): Promise<void> {
    if (this.isMockMode() || subscriptionId.startsWith('MOCK-')) {
      logger.info(`[PayPal Mock] Updated subscription ${subscriptionId} quantity to ${quantity}`);
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            op: 'replace',
            path: '/quantity',
            value: quantity.toString(),
          },
        ]),
      });

      if (response.status !== 204 && !response.ok) {
        const errorText = await response.text();
        logger.error('PayPal subscription quantity update failed', { status: response.status, errorText });
        throw AppError.internal('Failed to update PayPal subscription quantity');
      }

      logger.info(`PayPal subscription ${subscriptionId} quantity updated to ${quantity} successfully.`);
    } catch (error) {
      logger.error('Error updating PayPal subscription quantity', { error, subscriptionId });
      throw AppError.internal('Failed to update subscription quantity in PayPal');
    }
  }

  async cancelSubscription(subscriptionId: string, reason = 'Cancelled by user'): Promise<void> {
    if (this.isMockMode() || subscriptionId.startsWith('MOCK-')) {
      logger.info(`[PayPal Mock] Cancelled subscription ${subscriptionId} (reason: ${reason})`);
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.status !== 204 && !response.ok) {
        const errorText = await response.text();
        logger.error('PayPal cancel subscription failed', { status: response.status, errorText });
        throw AppError.internal('Failed to cancel PayPal subscription');
      }

      logger.info(`PayPal subscription ${subscriptionId} cancelled successfully.`);
    } catch (error) {
      logger.error('Error cancelling PayPal subscription', { error, subscriptionId });
      throw AppError.internal('Failed to cancel subscription in PayPal');
    }
  }
}

export const paypalService = new PaypalService();
