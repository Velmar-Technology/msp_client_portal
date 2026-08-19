import { User, TicketCategory, TicketPriority } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth';
import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { PRIORITY_WEIGHTS, LOAD_CAPACITY_THRESHOLD } from '@shared/config/constants';
import { logger } from '@shared/utils/logger';
import { IAssignmentStrategy } from './IAssignmentStrategy';

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
