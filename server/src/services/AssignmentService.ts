import { User, TicketCategory, TicketPriority } from '../types';
import { IAssignmentStrategy, CapacityWeightedAssignmentStrategy } from './strategies/AssignmentStrategy';

/**
 * Assignment Service — Implements Strategy-based distribution
 * with specialty-based filtering for technician assignment.
 */
export class AssignmentService {
  constructor(private strategy: IAssignmentStrategy = new CapacityWeightedAssignmentStrategy()) {}

  /**
   * Get the next technician to assign a ticket to.
   */
  async getNextTechnician(
    category: TicketCategory,
    requestedSpecialty?: string,
    priority?: TicketPriority,
  ): Promise<User | null> {
    return this.strategy.assign(category, requestedSpecialty, priority);
  }
}

export const assignmentService = new AssignmentService();
