import { User, TicketCategory, TicketPriority } from '../../types';

export interface IAssignmentStrategy {
  assign(category: TicketCategory, requestedSpecialty?: string, priority?: TicketPriority): Promise<User | null>;
}
