import { Request } from 'express';
import { createGatewayRateLimiter } from '@shared/middleware/gatewayRateLimiterMiddleware';

/**
 * Key generator combining IP address and email (if provided) for granular brute-force defense.
 */
function getIpAndEmailKey(req: Request): string {
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const email = (req.body?.email || req.body?.username || 'anonymous').toString().toLowerCase().trim();
  return `${ip}:${email}`;
}

/**
 * Key generator based strictly on client IP.
 */
function getIpOnlyKey(req: Request): string {
  return (req.ip || req.headers['x-forwarded-for'] || '127.0.0.1').toString();
}

/**
 * Brute-force rate limiter for /auth/login: 5 attempts per 5 minutes per IP + account.
 */
export const authLoginRateLimiter = createGatewayRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
  prefix: 'ratelimit:auth:login',
  keyGenerator: getIpAndEmailKey,
  message: 'Too many login attempts. Please try again in 5 minutes.',
});

/**
 * Brute-force rate limiter for /auth/register: 10 registrations per 15 minutes per IP.
 */
export const authRegisterRateLimiter = createGatewayRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  prefix: 'ratelimit:auth:register',
  keyGenerator: getIpOnlyKey,
  message: 'Too many registration requests. Please try again in 15 minutes.',
});

/**
 * Rate limiter for password reset requests: 5 attempts per 15 minutes per IP + account.
 */
export const authPasswordResetRateLimiter = createGatewayRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  prefix: 'ratelimit:auth:reset',
  keyGenerator: getIpAndEmailKey,
  message: 'Too many password reset attempts. Please try again in 15 minutes.',
});

/**
 * Rate limiter for token verification or OTP: 10 attempts per 10 minutes per IP.
 */
export const authVerificationRateLimiter = createGatewayRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  prefix: 'ratelimit:auth:verify',
  keyGenerator: getIpOnlyKey,
  message: 'Too many verification attempts. Please try again in 10 minutes.',
});
