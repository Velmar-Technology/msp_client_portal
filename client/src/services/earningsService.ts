import api from '@/services/api';

export interface TechnicianEarningBreakdown {
  priority: string;
  category: string;
  priorityMultiplier: number;
  slaMet: boolean;
  resolutionTimeMinutes: number;
  targetSlaMinutes?: number;
}

export interface TechnicianEarning {
  id: string;
  ticket_id: string;
  technician_id: string;
  base_amount: number;
  sla_bonus_amount: number;
  final_amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'VOIDED';
  breakdown: TechnicianEarningBreakdown;
  expense_id: string | null;
  tenant_id: string;
  earned_at: string;
  paid_at: string | null;
  ticket_title?: string;
  technician_name?: string;
  technician_email?: string;
}

export interface TechnicianEarningsSummary {
  technician_id: string;
  technician_name?: string;
  total_closed_tickets: number;
  total_earned: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  sla_met_count: number;
  sla_met_rate: number;
}

export interface TechnicianRate {
  id: string;
  technician_id: string | null;
  base_closed_rate: number;
  sla_bonus_rate: number;
  currency: string;
  multiplier_critical: number;
  multiplier_high: number;
  multiplier_medium: number;
  multiplier_low: number;
}

/**
 * Technician closed-ticket commissions, SLA bonus statistics, and payroll service.
 */
export const earningsService = {
  /**
   * Retrieves personal earnings, SLA bonus statistics, and closed ticket breakdown for logged-in technician.
   */
  async getMyEarnings(params?: { page?: number; limit?: number }): Promise<{
    summary: TechnicianEarningsSummary;
    items: TechnicianEarning[];
    total: number;
  }> {
    const res = await api.get('/system/technicians/me/earnings', { params });
    return res.data.data;
  },

  /**
   * Retrieves organization-wide technician earnings roster and detailed closed-ticket payout history (Admin only).
   */
  async getAdminOverview(params?: { status?: string; page?: number; limit?: number }): Promise<{
    summaries: TechnicianEarningsSummary[];
    items: TechnicianEarning[];
  }> {
    const res = await api.get('/system/technicians/earnings', { params });
    return res.data.data;
  },

  /**
   * Processes batch payout for selected earnings, marking them as PAID with payout timestamp (Admin only).
   */
  async processBatchPayout(earningIds: string[]): Promise<{ processed: number }> {
    const res = await api.post('/system/technicians/earnings/payout', { earningIds });
    return res.data.data;
  },

  /**
   * Configures base closed ticket compensation rate, SLA bonus rate, and priority multipliers (Admin only).
   */
  async updateRates(data: Partial<TechnicianRate>): Promise<TechnicianRate> {
    const res = await api.put('/system/technicians/rates', data);
    return res.data.data;
  },
};
