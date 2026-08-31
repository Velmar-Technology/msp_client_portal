import { db, apiKeys } from '@shared/db';
import { eq, and, desc } from 'drizzle-orm';
import { ApiKey } from '@shared/types';

/**
 * Data repository for persisted API keys owned by users, scoped by tenant isolation
 * and exposing ownership-aware lookups for safe list/delete operations.
 */
export class ApiKeyRepository {
  /**
   * Lists all API keys belonging to a user, newest first.
   *
   * @param userId - Unique user identifier
   * @returns Array of API key records
   */
  async findByUserId(userId: string): Promise<ApiKey[]> {
    const results = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.user_id, userId))
      .orderBy(desc(apiKeys.created_at));
    return results as ApiKey[];
  }

  /**
   * Finds a single API key ensuring it belongs to the given user (ownership guard).
   *
   * @param id - API key identifier
   * @param userId - Unique user identifier
   * @returns API key record or null if not found or not owned by the user
   */
  async findByIdAndUser(id: string, userId: string): Promise<ApiKey | null> {
    const results = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.user_id, userId)))
      .limit(1);
    return (results[0] as ApiKey) || null;
  }

  /**
   * Persists a newly generated API key record.
   *
   * @param data - API key creation attributes (owner, tenant, label, hashed token)
   * @returns Created API key record
   */
  async create(data: {
    userId: string;
    tenantId: string;
    name: string;
    tokenHash: string;
  }): Promise<ApiKey> {
    const results = await db
      .insert(apiKeys)
      .values({
        user_id: data.userId,
        tenant_id: data.tenantId,
        name: data.name,
        token_hash: data.tokenHash,
      })
      .returning();
    return results[0] as ApiKey;
  }

  /**
   * Deletes an API key only when it belongs to the given user (ownership guard).
   *
   * @param id - API key identifier
   * @param userId - Unique user identifier
   * @returns True when a matching key was deleted, false otherwise
   */
  async deleteById(id: string, userId: string): Promise<boolean> {
    const results = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.user_id, userId)))
      .returning({ id: apiKeys.id });
    return results.length > 0;
  }
}

export const apiKeyRepository = new ApiKeyRepository();