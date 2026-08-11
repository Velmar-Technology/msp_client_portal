import { User, TicketCategory } from '../types';
import { IAssignmentStrategy, RoundRobinAssignmentStrategy } from './strategies/AssignmentStrategy';

/**
 * Assignment Service — Implements Strategy-based distribution
 * with specialty-based filtering for technician assignment.
 */
export class AssignmentService {
  constructor(private strategy: IAssignmentStrategy = new RoundRobinAssignmentStrategy()) {}

  /**
   * Get the next technician to assign a ticket to.
   */
  async getNextTechnician(category: TicketCategory, requestedSpecialty?: string): Promise<User | null> {
    return this.strategy.assign(category, requestedSpecialty);
  }
}

export const assignmentService = new AssignmentService();
