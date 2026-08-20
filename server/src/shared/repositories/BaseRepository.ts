import { db, pool } from '@shared/db';
import { eq, desc } from 'drizzle-orm';
import { validate as isUuid } from 'uuid';

/**
 * Generic base repository providing reusable CRUD operations.
 * All repositories extend this to inherit common data access patterns.
 */
export abstract class BaseRepository<T> {
  constructor(
    protected readonly table: any,
    protected readonly tableName: string
  ) {}

  async findById(id: string): Promise<T | null> {
    if (!id || !isUuid(id)) {
      return null;
    }
    const result = await db.select().from(this.table).where(eq(this.table.id, id));
    return (result[0] as T) || null;
  }

  async findAll(limit = 20, offset = 0): Promise<T[]> {
    const orderBy = 'created_at' in this.table ? desc(this.table.created_at) : undefined;
    const query = db.select().from(this.table).limit(limit).offset(offset);
    if (orderBy) {
      query.orderBy(orderBy);
    }
    const result = await query;
    return result as T[];
  }

  async count(whereClause = '', params: unknown[] = []): Promise<number> {
    const query = whereClause
      ? `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) FROM ${this.tableName}`;
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  async deleteById(id: string): Promise<boolean> {
    if (!id || !isUuid(id)) {
      return false;
    }
    const result = await db.delete(this.table).where(eq(this.table.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Execute a raw query — for complex joins or custom operations.
   */
  protected async query<R = T>(sql: string, params: unknown[] = []): Promise<R[]> {
    const result = await pool.query(sql, params);
    return result.rows as R[];
  }

  /**
   * Execute a raw query returning a single row.
   */
  protected async queryOne<R = T>(sql: string, params: unknown[] = []): Promise<R | null> {
    const result = await pool.query(sql, params);
    return (result.rows[0] as R) || null;
  }
}
