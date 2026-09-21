import { z } from 'zod';

// ============================================
// Canonical Nav Counter Enums
// ============================================

export const NAV_KEYS = [
  'tickets',
  'devices',
  'resources',
  'passwordManager',
  'maintenance',
  'billing',
  'crm',
  'financial',
  'notifications',
] as const;

export type NavKey = (typeof NAV_KEYS)[number];

// ============================================
// Zod Schemas for Validation
// ============================================

export const NavKeySchema = z.enum(NAV_KEYS);

export const MarkNavSeenInputSchema = z.object({
  navKey: NavKeySchema,
});

export type MarkNavSeenInput = z.infer<typeof MarkNavSeenInputSchema>;

// ============================================
// Entity Response Contracts
// ============================================

export const NavCounterSchema = z.object({
  count: z.number().int().nonnegative(),
  latestAt: z.string().nullable(),
});

export type NavCounterContract = z.infer<typeof NavCounterSchema>;

export const NavCountersResponseSchema = z.record(NavKeySchema, NavCounterSchema);

export type NavCountersResponseContract = z.infer<typeof NavCountersResponseSchema>;
