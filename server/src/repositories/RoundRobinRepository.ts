import { db, roundRobinState } from '../db';
import { TicketCategory } from '../types';
import { eq } from 'drizzle-orm';

export class RoundRobinRepository {
  async getLastAssignedTechId(category: TicketCategory): Promise<string | undefined> {
    const stateResult = await db
      .select({ last_assigned_tech_id: roundRobinState.last_assigned_tech_id })
      .from(roundRobinState)
      .where(eq(roundRobinState.category, category));

    return stateResult[0]?.last_assigned_tech_id ?? undefined;
  }

  async updateLastAssignedTechId(category: TicketCategory, techId: string): Promise<void> {
    await db
      .insert(roundRobinState)
      .values({
        category,
        last_assigned_tech_id: techId,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: roundRobinState.category,
        set: {
          last_assigned_tech_id: techId,
          updated_at: new Date(),
        },
      });
  }
}

export const roundRobinRepository = new RoundRobinRepository();
