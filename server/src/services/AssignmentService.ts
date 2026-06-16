import { pool } from '../config/database';
import { userRepository } from '../repositories/UserRepository';
import { logger } from '../utils/logger';
import { User, TicketCategory } from '../types';

/**
 * Assignment Service — Implements Round-Robin distribution
 * with specialty-based filtering for technician assignment.
 *
 * Business Rules:
 * 1. Round-Robin: Distributes tickets evenly across available technicians.
 * 2. Specialty Filter: Certain categories may require specific specialties.
 * 3. Fallback: If no specialist is available, falls back to general rotation.
 */
export class AssignmentService {
  /**
   * Get the next technician to assign a ticket to, based on:
   * - Round-Robin rotation per category
   * - Specialty filtering when applicable
   */
  async getNextTechnician(category: TicketCategory, requestedSpecialty?: string): Promise<User | null> {
    // Get available technicians, optionally filtered by specialty
    let technicians: User[];

    if (requestedSpecialty) {
      technicians = await userRepository.findTechniciansBySpecialty(requestedSpecialty);
      if (technicians.length === 0) {
        logger.warn('No specialist found, falling back to general pool', { specialty: requestedSpecialty });
        technicians = await userRepository.findActiveTechnicians();
      }
    } else {
      technicians = await userRepository.findActiveTechnicians();
    }

    if (technicians.length === 0) {
      logger.warn('No active technicians available for assignment');
      return null;
    }

    // Get the last assigned tech for this category
    const stateResult = await pool.query(
      'SELECT last_assigned_tech_id FROM round_robin_state WHERE category = $1',
      [category],
    );

    const lastAssignedId = stateResult.rows[0]?.last_assigned_tech_id;

    // Find the next technician in rotation
    let nextTech: User;

    if (!lastAssignedId) {
      // No previous assignment — start with the first technician
      nextTech = technicians[0];
    } else {
      // Find the index of the last assigned tech
      const lastIndex = technicians.findIndex((t) => t.id === lastAssignedId);
      // Next in rotation (wraps around)
      const nextIndex = (lastIndex + 1) % technicians.length;
      nextTech = technicians[nextIndex];
    }

    // Update the round-robin state
    await pool.query(
      `INSERT INTO round_robin_state (category, last_assigned_tech_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (category) DO UPDATE SET last_assigned_tech_id = $2, updated_at = NOW()`,
      [category, nextTech.id],
    );

    logger.info('Technician assigned via Round-Robin', {
      techId: nextTech.id,
      techName: nextTech.name,
      category,
      specialty: nextTech.specialty,
    });

    return nextTech;
  }
}

export const assignmentService = new AssignmentService();
