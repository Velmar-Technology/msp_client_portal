import { z } from 'zod';
export {
  CreateTicketInputSchema as CreateTicketDTO,
  UpdateTicketStatusInputSchema as UpdateTicketStatusDTO,
  TicketQuerySchema as TicketQueryDTO,
  AssignTicketInputSchema as AssignTicketDTO,
  TicketIdParamSchema as TicketIdParamDTO,
  CreateTicketInput,
  UpdateTicketStatusInput,
  TicketQueryInput,
  AssignTicketInput,
  TicketIdParam as TicketIdParamInput,
} from '@shared/contracts';

export type CreateTicketOutput = z.output<typeof import('@shared/contracts').CreateTicketInputSchema>;

export const CreateTicketResponseDTO = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
});
export type CreateTicketResponseInput = z.infer<typeof CreateTicketResponseDTO>;
