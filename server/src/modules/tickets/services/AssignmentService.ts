import { User, TicketCategory, TicketPriority } from '@shared/types';
import { IAssignmentStrategy } from './strategies/IAssignmentStrategy';
import { CapacityWeightedAssignmentStrategy } from './strategies/CapacityWeightedAssignmentStrategy';

export class AssignmentService {
  constructor(private strategy: IAssignmentStrategy = new CapacityWeightedAssignmentStrategy()) {}

  async assignNext(
    category: TicketCategory,
    requestedSpecialty?: string,
    priority?: TicketPriority,
  ): Promise<User | null> {
    return this.strategy.assign(category, requestedSpecialty, priority);
  }
}

export const assignmentService = new AssignmentService();
