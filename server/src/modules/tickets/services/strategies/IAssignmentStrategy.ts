import { User, TicketCategory, TicketPriority } from '@shared/types';

export interface IAssignmentStrategy {
  assign(category: TicketCategory, requestedSpecialty?: string, priority?: TicketPriority): Promise<User | null>;
}
