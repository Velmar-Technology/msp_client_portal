import { db, roundRobinState } from '@shared/db';
import { TicketCategory } from '@shared/types';
import { eq } from 'drizzle-orm';

/**
 * Data repository persisting round-robin rotation state per ticket domain category.
 *
 * @see BL-102 (Round-Robin Technician Dispatch)
 */
export class RoundRobinRepository {
  /**
   * Retrieves the technician user UUID who was most recently assigned a ticket in the specified category.
   *
   * @param category - Ticket domain category
   * @returns UUID of last assigned technician, or undefined if no state exists
   * @see BL-102
   */
  async getLastAssignedTechId(category: TicketCategory): Promise<string | undefined> {
    const stateResult = await db
      .select({ last_assigned_tech_id: roundRobinState.last_assigned_tech_id })
      .from(roundRobinState)
      .where(eq(roundRobinState.category, category));

    return stateResult[0]?.last_assigned_tech_id ?? undefined;
  }

  /**
   * Updates or inserts the latest assigned technician ID for a ticket category.
   *
   * @param category - Ticket domain category
   * @param techId - Technician user UUID
   * @see BL-102
   */
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
