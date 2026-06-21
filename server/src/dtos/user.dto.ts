import { z } from 'zod';

export const UpdateProfileDTO = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  language: z.enum(['en_US', 'es_DO']).optional(),
  avatar_url: z.string().max(1000).optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileDTO>;

export const ChangePasswordDTO = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordDTO>;

