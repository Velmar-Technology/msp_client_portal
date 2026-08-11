import { User, TicketCategory, TicketPriority } from '../../types';
import { userRepository, UserRepository } from '../../repositories/UserRepository';
import { roundRobinRepository, RoundRobinRepository } from '../../repositories/RoundRobinRepository';
import { ticketRepository, TicketRepository } from '../../repositories/TicketRepository';
import { PRIORITY_WEIGHTS, LOAD_CAPACITY_THRESHOLD } from '../../config/constants';
import { logger } from '../../utils/logger';

export interface IAssignmentStrategy {
  assign(category: TicketCategory, requestedSpecialty?: string, priority?: TicketPriority): Promise<User | null>;
}

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

export class CapacityWeightedAssignmentStrategy implements IAssignmentStrategy {
  constructor(
    private userRepo: UserRepository = userRepository,
    private ticketRepo: TicketRepository = ticketRepository,
  ) {}

  async assign(category: TicketCategory, requestedSpecialty?: string, priority?: TicketPriority): Promise<User | null> {
    const specialists = requestedSpecialty ? await this.userRepo.findTechniciansBySpecialty(requestedSpecialty) : [];

    let pool: User[] = specialists;
    let usedFallback = false;
    if (pool.length === 0) {
      pool = await this.userRepo.findActiveTechnicians();
      usedFallback = true;
    }

    if (pool.length === 0) {
      logger.warn('No active technicians available for assignment');
      return null;
    }

    const loads = await this.calculateLoads(pool);
    const available = pool.filter((t) => (loads.get(t.id) ?? 0) <= LOAD_CAPACITY_THRESHOLD);

    let candidates = available.length > 0 ? available : pool;

    if (specialists.length > 0 && available.length === 0 && !usedFallback) {
      logger.warn('All specialists exceed capacity threshold, falling back to general pool', {
        threshold: LOAD_CAPACITY_THRESHOLD,
      });
      const general = await this.userRepo.findActiveTechnicians();
      if (general.length === 0) {
        logger.warn('No active technicians available for assignment');
        return null;
      }
      candidates = general;
    }

    const selected = [...candidates].sort((a, b) => (loads.get(a.id) ?? 0) - (loads.get(b.id) ?? 0))[0];

    logger.info('Technician assigned via Capacity-Weighted', {
      techId: selected.id,
      techName: selected.name,
      category,
      priority,
      load: loads.get(selected.id) ?? 0,
      specialist: !usedFallback && specialists.length > 0,
    });

    return selected;
  }

  private async calculateLoads(techs: User[]): Promise<Map<string, number>> {
    const loads = new Map<string, number>();
    if (techs.length === 0) return loads;

    const openTickets = await this.ticketRepo.findOpenTicketsForTechnicians(techs.map((t) => t.id));
    const loadByTech = new Map<string, number>();

    for (const ticket of openTickets) {
      if (!ticket.assigned_tech_id) continue;
      const weight = PRIORITY_WEIGHTS[ticket.priority] ?? PRIORITY_WEIGHTS.MEDIUM;
      loadByTech.set(ticket.assigned_tech_id, (loadByTech.get(ticket.assigned_tech_id) ?? 0) + weight);
    }

    for (const t of techs) {
      loads.set(t.id, loadByTech.get(t.id) ?? 0);
    }
    return loads;
  }
}
