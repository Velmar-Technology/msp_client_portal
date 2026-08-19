import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { ticketResponseRepository, TicketResponseRepository } from '@modules/tickets/repositories/TicketResponseRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { assignmentService, AssignmentService } from '@modules/tickets/services/AssignmentService';
import { notificationService, NotificationService } from '@modules/notifications';
import { AppError } from '@shared/utils/AppError';
import { logger } from '@shared/utils/logger';
import { ESCALATION_THRESHOLDS_MS, TIER_2_SPECIALTY } from '@shared/config/constants';
import { Ticket, TicketStatus } from '@shared/types';

export class EscalationService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private responseRepo: TicketResponseRepository = ticketResponseRepository,
    private userRepo: UserRepository = userRepository,
    private assignmentSvc: AssignmentService = assignmentService,
    private notifSvc: NotificationService = notificationService,
  ) {}

  async enforceEscalation(ticketId: string): Promise<Ticket | null> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      return null;
    }

    if (this.isWithinThreshold(ticket)) {
      return null;
    }

    if (!(await this.isUnworked(ticket))) {
      return null;
    }

    if (await this.isAssignedToTierTwo(ticket)) {
      return null;
    }

    const technician = await this.assignmentSvc.assignNext(ticket.category, TIER_2_SPECIALTY, ticket.priority);
    if (!technician) {
      logger.warn('No Tier 2 specialist available for escalation', { ticketId });
      return null;
    }

    const updated = await this.ticketRepo.assignTechnician(ticketId, technician.id);
    if (!updated) {
      throw AppError.internal('Failed to assign technician during escalation');
    }

    await this.eventRepo.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: ticket.status,
      changed_by: ticket.client_id,
      notes: `Escalated to Tier 2 specialist (${technician.name}) after priority SLA threshold`,
      tenant_id: ticket.tenant_id,
    });

    const fullUpdatedTicket = (await this.ticketRepo.findById(ticketId)) || updated;
    await this.notifSvc.onTicketAssigned(fullUpdatedTicket, technician);

    logger.info('Ticket escalated to Tier 2', { ticketId, techId: technician.id, priority: ticket.priority });
    return fullUpdatedTicket;
  }

  async processPendingEscalations(tenantId?: string): Promise<{ escalated: number }> {
    const minThreshold = Math.min(...Object.values(ESCALATION_THRESHOLDS_MS));
    const cutoff = new Date(Date.now() - minThreshold);
    const candidates = await this.ticketRepo.findPendingEscalations(cutoff);

    let escalated = 0;
    for (const candidate of candidates) {
      if (tenantId && candidate.tenant_id !== tenantId) continue;
      try {
        const result = await this.enforceEscalation(candidate.id);
        if (result) escalated += 1;
      } catch (err) {
        logger.error('Failed to escalate ticket', { ticketId: candidate.id, error: err });
      }
    }

    if (escalated > 0) {
      logger.info(`Processed pending escalations: ${escalated} ticket(s) escalated`, { tenantId });
    }
    return { escalated };
  }

  private isWithinThreshold(ticket: Ticket): boolean {
    const threshold = ESCALATION_THRESHOLDS_MS[ticket.priority];
    if (!threshold) return true;
    return Date.now() - new Date(ticket.created_at).getTime() <= threshold;
  }

  private async isUnworked(ticket: Ticket): Promise<boolean> {
    if (!ticket.assigned_tech_id) return true;
    const responses = await this.responseRepo.findByTicket(ticket.id);
    return responses.length === 0;
  }

  private async isAssignedToTierTwo(ticket: Ticket): Promise<boolean> {
    if (!ticket.assigned_tech_id) return false;
    const current = await this.userRepo.findById(ticket.assigned_tech_id);
    if (current && current.specialty && current.specialty.includes(TIER_2_SPECIALTY)) {
      logger.info('Ticket already assigned to a Tier 2 specialist, skipping escalation', { ticketId: ticket.id });
      return true;
    }
    return false;
  }
}

export const escalationService = new EscalationService();
