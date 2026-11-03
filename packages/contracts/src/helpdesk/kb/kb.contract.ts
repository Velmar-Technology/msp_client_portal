import { z } from 'zod';

export const KbStatusEnum = z.enum(['ACTIVE', 'ARCHIVED']);
export type KbStatus = z.infer<typeof KbStatusEnum>;

export const CreateKbInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  status: KbStatusEnum.default('ACTIVE'),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateKbInput = z.infer<typeof CreateKbInputSchema>;

export const UpdateKbInputSchema = CreateKbInputSchema.partial();
export type UpdateKbInput = z.infer<typeof UpdateKbInputSchema>;

export const KbParamsSchema = z.object({
  id: z.string().uuid(),
});

export const KbRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  status: KbStatusEnum,
  notes: z.string().nullable().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type KbRecord = z.infer<typeof KbRecordSchema>;
