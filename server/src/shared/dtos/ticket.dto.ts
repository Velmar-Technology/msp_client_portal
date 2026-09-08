import { z } from 'zod';
export {
  CreateTicketInputSchema as CreateTicketDTO,
  UpdateTicketStatusInputSchema as UpdateTicketStatusDTO,
  TicketQuerySchema as TicketQueryDTO,
  AssignTicketInputSchema as AssignTicketDTO,
  TicketIdParamSchema as TicketIdParamDTO,
  type CreateTicketInput,
  type UpdateTicketStatusInput,
  type TicketQueryInput,
  type AssignTicketInput,
  type TicketIdParam as TicketIdParamInput,
} from '@shared/contracts';

export type CreateTicketOutput = import('@shared/contracts').CreateTicketInput;

export const CreateTicketResponseDTO = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
});
export type CreateTicketResponseInput = z.infer<typeof CreateTicketResponseDTO>;
