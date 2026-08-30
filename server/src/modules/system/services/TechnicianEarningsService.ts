import { technicianEarningsRepository, TechnicianEarningsRepository } from '../repositories/TechnicianEarningsRepository';
import { expenseRepository, ExpenseRepository } from '@modules/billing';
import { userRepository, UserRepository } from '@modules/auth';
import { calculateElapsedBusinessMs } from '@shared/utils/businessHours';
import { logger } from '@shared/utils/logger';
import {
  Ticket,
  TicketPriority,
  TechnicianEarning,
  TechnicianRate,
  TechnicianEarningsSummary,
  EarningStatus,
  UserContext,
} from '@shared/types';
import { ValidationError, ForbiddenError } from '@shared/errors';

/** Target resolution SLA windows in business hours by priority */
const RESOLUTION_SLA_HOURS: Record<string, number> = {
  [TicketPriority.CRITICAL]: 2,
  [TicketPriority.HIGH]: 4,
  [TicketPriority.MEDIUM]: 8,
  [TicketPriority.LOW]: 24,
};

/**
 * Domain service calculating technician closed-ticket commissions, SLA bonus incentives,
 * and automatically posting pre-split operational expenses (OpEx) to ensure HQ absorption.
 */
export class TechnicianEarningsService {
  /**
   * Initializes TechnicianEarningsService with repository dependencies.
   *
   * @param earningsRepo - Technician earnings repository
   * @param expenseRepo - Expense repository for OpEx auto-posting
   * @param userRepo - User repository for technician lookups
   */
  constructor(
    private earningsRepo: TechnicianEarningsRepository = technicianEarningsRepository,
    private expenseRepo: ExpenseRepository = expenseRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  /**
   * Calculates and records earnings when a ticket is closed or resolved by a technician.
   * Also auto-records a corresponding operational expense in the OpEx ledger.
   *
   * @param ticket - Target Ticket entity being resolved or closed
   * @param technicianId - ID of the technician who resolved the ticket
   * @param tenantId - Tenant UUID
   * @returns Created TechnicianEarning record or null if not eligible
   */
  async calculateAndRecordEarnings(
    ticket: Ticket,
    technicianId: string,
    tenantId: string
  ): Promise<TechnicianEarning | null> {
    // 1. Eligibility Checks: Skip automated resolutions or missing technicians
    if (ticket.status === 'RESOLVED_AUTOMATED' || !technicianId) {
      logger.info('Skipping earnings calculation: automated ticket or unassigned technician', {
        ticketId: ticket.id,
        status: ticket.status,
      });
      return null;
    }

    // 2. Prevent duplicate payout for same ticket
    const existing = await this.earningsRepo.findByTicketId(ticket.id);
    if (existing) {
      logger.warn('Earnings already recorded for ticket', { ticketId: ticket.id, earningId: existing.id });
      return existing;
    }

    // 3. Retrieve rate profile
    const rateProfile = await this.earningsRepo.getRateForTechnician(technicianId, tenantId);
    const baseRate = rateProfile ? Number(rateProfile.base_closed_rate) : 8.0;
    const slaBonusRate = rateProfile ? Number(rateProfile.sla_bonus_rate) : 4.0;
    const currency = rateProfile?.currency || 'USD';

    // 4. Determine Priority Multiplier
    const priority = (ticket.priority || TicketPriority.LOW).toUpperCase();
    let priorityMultiplier = 1.0;
    if (priority === TicketPriority.CRITICAL) {
      priorityMultiplier = rateProfile ? Number(rateProfile.multiplier_critical) : 2.5;
    } else if (priority === TicketPriority.HIGH) {
      priorityMultiplier = rateProfile ? Number(rateProfile.multiplier_high) : 1.75;
    } else if (priority === TicketPriority.MEDIUM) {
      priorityMultiplier = rateProfile ? Number(rateProfile.multiplier_medium) : 1.25;
    } else {
      priorityMultiplier = rateProfile ? Number(rateProfile.multiplier_low) : 1.0;
    }

    // 5. Evaluate SLA Adherence
    const targetSlaHours = RESOLUTION_SLA_HOURS[priority] || 8;
    const targetSlaMs = targetSlaHours * 60 * 60 * 1000;
    const elapsedBusinessMs = calculateElapsedBusinessMs(new Date(ticket.created_at), new Date());
    const slaMet = elapsedBusinessMs <= targetSlaMs;
    const elapsedMinutes = Math.round(elapsedBusinessMs / (60 * 1000));

    // 6. Calculate Final Commission
    const baseAmount = Number((baseRate * priorityMultiplier).toFixed(2));
    const slaBonusAmount = slaMet ? Number(slaBonusRate.toFixed(2)) : 0;
    const finalAmount = Number((baseAmount + slaBonusAmount).toFixed(2));

    // 7. Lookup technician details for clean OpEx logging
    const techUser = await this.userRepo.findById(technicianId);
    const techName = techUser?.name || 'Technician';

    // 8. Auto-post Pre-Split OpEx Entry in `expenses` table
    let expenseId: string | null = null;
    try {
      const createdExpense = await this.expenseRepo.create({
        amount: finalAmount,
        description: `Commission for closed ticket: "${ticket.title}" (Ref: ${ticket.id.substring(0, 8)}) — Tech: ${techName}`,
        category: 'Labor & Technician Commissions',
        expense_date: new Date(),
        tenant_id: tenantId,
        expense_identifier: `EARN-${ticket.id.substring(0, 8)}`,
      });
      expenseId = createdExpense.id;
    } catch (err) {
      logger.error('Failed to auto-post technician commission to expenses table', { error: err, ticketId: ticket.id });
    }

    // 9. Record Earning in Ledger
    const earning = await this.earningsRepo.createEarning({
      ticket_id: ticket.id,
      technician_id: technicianId,
      base_amount: baseAmount,
      sla_bonus_amount: slaBonusAmount,
      final_amount: finalAmount,
      currency,
      status: EarningStatus.PENDING,
      breakdown: {
        priority,
        category: ticket.category,
        priorityMultiplier,
        slaMet,
        resolutionTimeMinutes: elapsedMinutes,
        targetSlaMinutes: targetSlaHours * 60,
      },
      expense_id: expenseId,
      tenant_id: tenantId,
    });

    logger.info('Technician earning recorded and OpEx ledger updated', {
      earningId: earning.id,
      ticketId: ticket.id,
      technicianId,
      finalAmount,
      slaMet,
      expenseId,
    });

    return earning;
  }

  /**
   * Voids pending earnings and reverses OpEx if a closed ticket is reopened.
   *
   * @param ticketId - Target ticket UUID
   * @param tenantId - Tenant UUID
   * @returns Voided TechnicianEarning or null
   */
  async voidEarningsForReopenedTicket(ticketId: string, _tenantId?: string): Promise<TechnicianEarning | null> {
    const existing = await this.earningsRepo.findByTicketId(ticketId);
    if (!existing || existing.status === EarningStatus.VOIDED || existing.status === EarningStatus.PAID) {
      return null;
    }

    const updated = await this.earningsRepo.updateStatus(existing.id, EarningStatus.VOIDED);

    logger.warn('Technician earning voided due to ticket reopening', {
      earningId: existing.id,
      ticketId,
      technicianId: existing.technician_id,
    });

    return updated;
  }

  /**
   * Retrieves paginated earnings and summary stats for a technician.
   *
   * @param technicianId - Technician UUID
   * @param tenantId - Tenant UUID
   * @param page - Page number
   * @param limit - Page size
   * @returns Object with summary metrics and earnings list
   */
  async getTechnicianEarnings(
    technicianId: string,
    tenantId: string,
    page = 1,
    limit = 50
  ): Promise<{ summary: TechnicianEarningsSummary; items: TechnicianEarning[]; total: number }> {
    const offset = (page - 1) * limit;
    const [summary, items] = await Promise.all([
      this.earningsRepo.getSummaryByTechnician(technicianId, tenantId),
      this.earningsRepo.findByTechnician(technicianId, tenantId, limit, offset),
    ]);

    return {
      summary,
      items,
      total: summary.total_closed_tickets,
    };
  }

  /**
   * Retrieves tenant-wide payroll overview across all technicians for admin users.
   *
   * @param tenantId - Tenant UUID
   * @param status - Optional status filter ('PENDING' | 'APPROVED' | 'PAID' | 'VOIDED')
   * @param page - Page number
   * @param limit - Page size
   * @returns Object with roster summaries and detailed earnings list
   */
  async getAdminEarningsOverview(
    tenantId: string,
    status?: string,
    page = 1,
    limit = 100
  ): Promise<{ summaries: TechnicianEarningsSummary[]; items: TechnicianEarning[] }> {
    const offset = (page - 1) * limit;
    const [summaries, items] = await Promise.all([
      this.earningsRepo.getAllTechniciansSummary(tenantId),
      this.earningsRepo.findAll(tenantId, status, limit, offset),
    ]);

    return {
      summaries,
      items,
    };
  }

  /**
   * Batch updates status of approved earnings to PAID with a timestamp.
   *
   * @param earningIds - Array of earning UUIDs to process
   * @param ctx - Authenticated user context (must be ADMIN)
   * @returns Count of processed earnings
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {ValidationError} When no earning IDs are provided
   */
  async processBatchPayout(earningIds: string[], ctx: UserContext): Promise<{ processed: number }> {
    if (ctx.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can process technician payouts');
    }

    if (!Array.isArray(earningIds) || earningIds.length === 0) {
      throw new ValidationError('At least one earning ID must be provided');
    }

    const processed = await this.earningsRepo.batchUpdateStatus(earningIds, EarningStatus.PAID, new Date());
    logger.info('Processed batch technician payouts', { count: processed, adminId: ctx.userId });
    return { processed };
  }

  /**
   * Configures base closed rate and priority multipliers.
   *
   * @param data - Rate parameters
   * @param ctx - Authenticated user context
   * @returns Created or updated TechnicianRate record
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {ValidationError} When base rates are negative
   */
  async updateRates(
    data: {
      technician_id?: string | null;
      base_closed_rate: number;
      sla_bonus_rate: number;
      currency?: string;
      multiplier_critical?: number;
      multiplier_high?: number;
      multiplier_medium?: number;
      multiplier_low?: number;
    },
    ctx: UserContext
  ): Promise<TechnicianRate> {
    if (ctx.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can configure compensation rates');
    }

    if (data.base_closed_rate < 0 || data.sla_bonus_rate < 0) {
      throw new ValidationError('Rates cannot be negative values');
    }

    return this.earningsRepo.upsertRate({
      ...data,
      tenant_id: ctx.tenantId,
    });
  }
}

export const technicianEarningsService = new TechnicianEarningsService();
