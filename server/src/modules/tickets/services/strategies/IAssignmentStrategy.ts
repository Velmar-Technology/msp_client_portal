import { User, TicketCategory, TicketPriority } from '@shared/types';

/**
 * Strategy interface for selecting a technician for ticket assignment.
 */
export interface IAssignmentStrategy {
  /**
   * Selects an eligible technician based on domain category, requested specialty, and ticket priority.
   *
   * @param category - Ticket category
   * @param requestedSpecialty - Optional specialty tag filter
   * @param priority - Ticket priority level
   * @returns Selected technician user or null if none available
   */
  assign(category: TicketCategory, requestedSpecialty?: string, priority?: TicketPriority): Promise<User | null>;
}
