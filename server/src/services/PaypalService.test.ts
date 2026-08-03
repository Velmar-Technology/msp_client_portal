import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from '../config/env';
import { PaypalService } from './PaypalService';

describe('PaypalService', () => {
  let service: PaypalService;

  beforeEach(() => {
    service = new PaypalService();
  });

  describe('baseUrl', () => {
    const originalNodeEnv = env.NODE_ENV;
    const originalPaypalApiUrl = env.PAYPAL_API_URL;

    afterEach(() => {
      (env as any).NODE_ENV = originalNodeEnv;
      (env as any).PAYPAL_API_URL = originalPaypalApiUrl;
    });

    it('returns production PayPal API URL when NODE_ENV is production', () => {
      (env as any).NODE_ENV = 'production';
      (env as any).PAYPAL_API_URL = '';
      expect(service.baseUrl).toBe('https://api-m.paypal.com');
    });

    it('returns sandbox PayPal API URL when NODE_ENV is development', () => {
      (env as any).NODE_ENV = 'development';
      (env as any).PAYPAL_API_URL = '';
      expect(service.baseUrl).toBe('https://api-m.sandbox.paypal.com');
    });

    it('returns sandbox PayPal API URL when NODE_ENV is test', () => {
      (env as any).NODE_ENV = 'test';
      (env as any).PAYPAL_API_URL = '';
      expect(service.baseUrl).toBe('https://api-m.sandbox.paypal.com');
    });

    it('prioritizes env.PAYPAL_API_URL when set', () => {
      (env as any).PAYPAL_API_URL = 'https://custom-paypal-gateway.com/';
      expect(service.baseUrl).toBe('https://custom-paypal-gateway.com');
    });
  });

  describe('mock mode', () => {
    const originalClientId = env.PAYPAL_CLIENT_ID;
    const originalClientSecret = env.PAYPAL_CLIENT_SECRET;

    beforeEach(() => {
      (env as any).PAYPAL_CLIENT_ID = '';
      (env as any).PAYPAL_CLIENT_SECRET = '';
    });

    afterEach(() => {
      (env as any).PAYPAL_CLIENT_ID = originalClientId;
      (env as any).PAYPAL_CLIENT_SECRET = originalClientSecret;
    });

    it('creates mock order when credentials are not configured', async () => {
      const mockInvoice = {
        id: 'inv-123',
        invoice_number: 'INV-001',
        total: 100,
      } as any;

      const order = await service.createOrder(mockInvoice);
      expect(order.id).toMatch(/^MOCK-PAYPAL-/);
      expect(order.status).toBe('CREATED');
    });

    it('captures mock order cleanly', async () => {
      const result = await service.captureOrder('MOCK-PAYPAL-123');
      expect(result.status).toBe('COMPLETED');
      expect(result.captureId).toMatch(/^MOCK-CAP-/);
    });

    it('retrieves mock order details', async () => {
      const order = await service.getOrder('MOCK-PAYPAL-123');
      expect(order.id).toBe('MOCK-PAYPAL-123');
      expect(order.status).toBe('COMPLETED');
    });
  });
});
