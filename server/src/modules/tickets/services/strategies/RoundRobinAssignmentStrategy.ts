import { User, TicketCategory, TicketPriority } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth';
import { roundRobinRepository, RoundRobinRepository } from '@modules/tickets/repositories/RoundRobinRepository';
import { distributedLock, DistributedLock } from '@shared/utils/cache';
import { logger } from '@shared/utils/logger';
import { IAssignmentStrategy } from './IAssignmentStrategy';

/**
 * Round-robin technician assignment strategy with distributed lock concurrency control.
 * Rotates assignments across specialists or general pool in balanced cyclical sequence.
 *
 * @see BL-102 (Round-Robin Technician Dispatch)
 */
export class RoundRobinAssignmentStrategy implements IAssignmentStrategy {
  /**
   * Initializes RoundRobinAssignmentStrategy with dependencies.
   *
   * @param userRepo - User repository
   * @param roundRobinRepo - Round-robin state repository
   * @param lock - Distributed lock primitive
   */
  constructor(
    private userRepo: UserRepository = userRepository,
    private roundRobinRepo: RoundRobinRepository = roundRobinRepository,
    private lock: DistributedLock = distributedLock
  ) {}

  /**
   * Rotates and assigns the next technician in round-robin order within a distributed lock.
   *
   * @param category - Ticket category
   * @param requestedSpecialty - Optional specialist domain filter
   * @param _priority - Optional priority level
   * @returns Next assigned technician or null if no technicians available
   * @see BL-102
   */
  async assign(category: TicketCategory, requestedSpecialty?: string, _priority?: TicketPriority): Promise<User | null> {
    return this.lock.withLock(`round_robin:${category}`, 3000, async () => {
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
    });
  }
}

