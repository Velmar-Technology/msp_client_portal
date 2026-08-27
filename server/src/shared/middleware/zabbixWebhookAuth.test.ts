import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { zabbixWebhookAuth } from './zabbixWebhookAuth';
import { ForbiddenError } from '@shared/errors';

vi.mock('@shared/config/env', () => ({
  env: {
    ZABBIX_WEBHOOK_SECRET: 'my-super-secret-webhook-key',
  },
}));

describe('zabbixWebhookAuth', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {} };
    res = {};
    next = vi.fn();
  });

  it('calls next() when ZABBIX_WEBHOOK_SECRET is empty', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = '';

    req.body = { secret: 'anything', triggername: 'Test alert' };
    zabbixWebhookAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.secret).toBe('anything');
  });

  it('calls next() when ZABBIX_WEBHOOK_SECRET is placeholder "secret_key"', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'secret_key';

    req.body = { secret: 'secret_key', triggername: 'Test alert' };
    zabbixWebhookAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('passes with valid secret and strips secret from body', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'my-super-secret-webhook-key';

    req.body = { secret: 'my-super-secret-webhook-key', triggername: 'CPU high' };
    zabbixWebhookAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.secret).toBeUndefined();
    expect(req.body.triggername).toBe('CPU high');
  });

  it('throws ForbiddenError when secret is missing from body', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'my-super-secret-webhook-key';

    req.body = { triggername: 'CPU high' };

    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow(ForbiddenError);
    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow('Missing webhook secret');
  });

  it('throws ForbiddenError when secret is empty string in body', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'my-super-secret-webhook-key';

    req.body = { secret: '', triggername: 'CPU high' };

    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when secret is whitespace-only in body', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'my-super-secret-webhook-key';

    req.body = { secret: '   ', triggername: 'CPU high' };

    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow(ForbiddenError);
  });

  it('throws ForbiddenError when secret does not match (timing-safe)', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'my-super-secret-webhook-key';

    req.body = { secret: 'wrong-secret-value', triggername: 'CPU high' };

    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow(ForbiddenError);
    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow('Invalid webhook secret');
  });

  it('throws ForbiddenError when secret is a substring of the real secret', async () => {
    const env = await import('@shared/config/env');
    (env as any).env.ZABBIX_WEBHOOK_SECRET = 'my-super-secret-webhook-key';

    req.body = { secret: 'my-super-secret-webhook', triggername: 'CPU high' };

    expect(() => zabbixWebhookAuth(req as Request, res as Response, next)).toThrow(ForbiddenError);
  });
});
