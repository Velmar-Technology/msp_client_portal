import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '@shared/config/env';
import { ForbiddenError } from '@shared/errors';
import { logger } from '@shared/utils/logger';

const PLACEHOLDER_SECRETS = ['secret_key', 'your_zabbix_webhook_secret_here', ''];

/**
 * Middleware that verifies the Zabbix webhook pre-shared secret
 * sent in the request body `secret` field using timing-safe comparison.
 *
 * If ZABBIX_WEBHOOK_SECRET is not configured or is a placeholder,
 * verification is skipped (graceful degradation for dev/unconfigured envs).
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 * @throws {ForbiddenError} When secret is missing or fails timing-safe match
 */
export function zabbixWebhookAuth(req: Request, _res: Response, next: NextFunction): void {
  const configuredSecret = env.ZABBIX_WEBHOOK_SECRET?.trim() || '';

  if (PLACEHOLDER_SECRETS.includes(configuredSecret.toLowerCase())) {
    logger.warn('Zabbix webhook secret is unset or placeholder — skipping verification');
    next();
    return;
  }

  const bodySecret = (req.body as Record<string, unknown>)?.secret;

  if (typeof bodySecret !== 'string' || bodySecret.trim() === '') {
    throw new ForbiddenError('Missing webhook secret in request body');
  }

  const bodyBuf = Buffer.from(bodySecret, 'utf8');
  const secretBuf = Buffer.from(configuredSecret, 'utf8');

  if (bodyBuf.length !== secretBuf.length || !crypto.timingSafeEqual(bodyBuf, secretBuf)) {
    throw new ForbiddenError('Invalid webhook secret');
  }

  delete (req.body as Record<string, unknown>).secret;
  next();
}
