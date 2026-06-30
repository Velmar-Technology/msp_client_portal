import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { Invoice } from '../types';

export class PaypalService {
  private get baseUrl(): string {
    return env.NODE_ENV === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
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
}

export const paypalService = new PaypalService();
