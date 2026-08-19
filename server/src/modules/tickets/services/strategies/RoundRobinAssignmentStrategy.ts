import { User, TicketCategory, TicketPriority } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth';
import { roundRobinRepository, RoundRobinRepository } from '@modules/tickets/repositories/RoundRobinRepository';
import { logger } from '@shared/utils/logger';
import { IAssignmentStrategy } from './IAssignmentStrategy';

export class RoundRobinAssignmentStrategy implements IAssignmentStrategy {
  constructor(
    private userRepo: UserRepository = userRepository,
    private roundRobinRepo: RoundRobinRepository = roundRobinRepository,
  ) {}

  async assign(category: TicketCategory, requestedSpecialty?: string, _priority?: TicketPriority): Promise<User | null> {
    let technicians: User[];

    if (requestedSpecialty) {
      technicians = await this.userRepo.findTechniciansBySpecialty(requestedSpecialty);
      if (technicians.length === 0) {
        logger.warn('No specialist found, falling back to general pool', { specialty: requestedSpecialty });
        technicians = await this.userRepo.findActiveTechnicians();
      }
    } else {
      technicians = await this.userRepo.findActiveTechnicians();
    }

    if (technicians.length === 0) {
      logger.warn('No active technicians available for assignment');
      return null;
    }

    const lastAssignedId = await this.roundRobinRepo.getLastAssignedTechId(category);

    let nextTech: User;
    if (!lastAssignedId) {
      nextTech = technicians[0];
    } else {
      const lastIndex = technicians.findIndex((t) => t.id === lastAssignedId);
      const nextIndex = (lastIndex + 1) % technicians.length;
      nextTech = technicians[nextIndex];
    }

    await this.roundRobinRepo.updateLastAssignedTechId(category, nextTech.id);

    logger.info('Technician assigned via Round-Robin', {
      techId: nextTech.id,
      techName: nextTech.name,
      category,
      specialty: nextTech.specialty,
    });

    return nextTech;
  }
}
