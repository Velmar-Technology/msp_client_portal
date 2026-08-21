import { User, TicketCategory, TicketPriority } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth';
import { notificationService, NotificationService } from '@modules/notifications';
import { IAssignmentStrategy } from './strategies/IAssignmentStrategy';
import { CapacityWeightedAssignmentStrategy } from './strategies/CapacityWeightedAssignmentStrategy';
import { logger } from '@shared/utils/logger';

export class AssignmentService {
  constructor(
    private strategy: IAssignmentStrategy = new CapacityWeightedAssignmentStrategy(),
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
  ) {}

  async assignNext(
    category: TicketCategory,
    requestedSpecialty?: string,
    priority?: TicketPriority,
  ): Promise<User | null> {
    const assigned = await this.strategy.assign(category, requestedSpecialty, priority);
    if (assigned) return assigned;
    return this.assignOnlineTechnician(category);
  }

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
