import { z } from 'zod';
import { MaintenanceStatus, MaintenanceType } from '../types';

export const CreateMaintenanceDTO = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID'),
  scheduledDate: z.string().datetime({ message: 'scheduledDate must be an ISO date string' }).optional(),
  monthsAhead: z.number().int().min(1).max(24).optional().default(6),
  maintenanceType: z.nativeEnum(MaintenanceType).optional().default(MaintenanceType.PREDEFINED_6M),
  assignedTechId: z.string().uuid('Invalid technician ID').nullable().optional(),
  title: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateMaintenanceInput = z.infer<typeof CreateMaintenanceDTO>;

export const UpdateMaintenanceDTO = z.object({
  scheduledDate: z.string().datetime().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  assignedTechId: z.string().uuid('Invalid technician ID').nullable().optional(),
  title: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateMaintenanceInput = z.infer<typeof UpdateMaintenanceDTO>;

export const MaintenanceQueryDTO = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clientId: z.string().uuid().optional(),
  techId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});
export type MaintenanceQueryInput = z.infer<typeof MaintenanceQueryDTO>;
