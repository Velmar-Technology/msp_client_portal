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

// ---- Admin User Management DTOs ----

export const UpdateUserRoleDTO = z.object({
  role: z.enum(['CLIENT', 'TECHNICIAN', 'ADMIN'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be CLIENT, TECHNICIAN, or ADMIN',
  }),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleDTO>;

export const UpdateUserStatusDTO = z.object({
  is_active: z.boolean({
    required_error: 'Active status is required',
    invalid_type_error: 'Active status must be a boolean',
  }),
});
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusDTO>;

export const BulkUpdateUserStatusDTO = z.object({
  userIds: z.array(z.string().uuid({ message: 'Each user ID must be a valid UUID' })).min(1, 'At least one user ID is required'),
  is_active: z.boolean({
    required_error: 'Active status is required',
    invalid_type_error: 'Active status must be a boolean',
  }),
});
export type BulkUpdateUserStatusInput = z.infer<typeof BulkUpdateUserStatusDTO>;

export const BulkUpdateUserRoleDTO = z.object({
  userIds: z.array(z.string().uuid({ message: 'Each user ID must be a valid UUID' })).min(1, 'At least one user ID is required'),
  role: z.enum(['CLIENT', 'TECHNICIAN', 'ADMIN'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be CLIENT, TECHNICIAN, or ADMIN',
  }),
});
export type BulkUpdateUserRoleInput = z.infer<typeof BulkUpdateUserRoleDTO>;

