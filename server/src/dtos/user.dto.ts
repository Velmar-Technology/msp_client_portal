import { z } from 'zod';

export const UpdateProfileDTO = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileDTO>;
