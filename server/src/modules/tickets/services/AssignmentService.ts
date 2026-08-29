import { User, TicketCategory, TicketPriority } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth';
import { notificationService, NotificationService } from '@modules/notifications';
import { IAssignmentStrategy } from './strategies/IAssignmentStrategy';
import { CapacityWeightedAssignmentStrategy } from './strategies/CapacityWeightedAssignmentStrategy';
import { logger } from '@shared/utils/logger';

/**
 * Domain service orchestrating technician assignment workflows using configurable strategies
 * (e.g. CapacityWeighted, RoundRobin) with active online technician fallback.
 *
 * @see BL-102 (Round-Robin & Category Dispatch)
 */
export class AssignmentService {
  /**
   * Initializes AssignmentService with an assignment strategy and user/notification dependencies.
   *
   * @param strategy - Active technician selection strategy
   * @param userRepo - User repository
   * @param notifSvc - Notification service for checking real-time online socket connections
   */
  constructor(
    private strategy: IAssignmentStrategy = new CapacityWeightedAssignmentStrategy(),
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
  ) {}

  /**
   * Selects the best candidate technician for a ticket based on strategy and online availability.
   *
   * @param category - Ticket category
   * @param requestedSpecialty - Optional specialty tag filter
   * @param priority - Ticket priority level
   * @returns Assigned technician User entity or null if no technician is available
   * @see BL-102
   */
  async assignNext(
    category: TicketCategory,
    requestedSpecialty?: string,
    priority?: TicketPriority,
  ): Promise<User | null> {
    const assigned = await this.strategy.assign(category, requestedSpecialty, priority);
    if (assigned) return assigned;
    return this.assignOnlineTechnician(category);
  }

  /**
   * Fallback assignment mechanism: selects an actively connected online technician.
   *
   * @param category - Ticket category
   * @returns First available online technician or null
   */
  private async assignOnlineTechnician(category: TicketCategory): Promise<User | null> {
    const connectedIds = this.notifSvc.getConnectedUserIds();
    if (connectedIds.length === 0) return null;

    const technicians = await this.userRepo.findAllTechnicians();
    const online = technicians.filter((t) => connectedIds.includes(t.id));
    if (online.length === 0) return null;

    const selected = online[0];
    logger.info('Technician assigned via online fallback', {
      techId: selected.id,
      techName: selected.name,
      category,
      onlineTechnicians: online.length,
    });
    return selected;
  }
}

export const assignmentService = new AssignmentService();
