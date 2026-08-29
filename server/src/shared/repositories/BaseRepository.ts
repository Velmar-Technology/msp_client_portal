import { db, pool } from '@shared/db';
import { eq, desc } from 'drizzle-orm';
import { validate as isUuid } from 'uuid';

/**
 * Generic base repository providing reusable CRUD operations and raw pool execution helpers.
 * All domain repositories extend this to inherit standard primary key lookups, pagination, and counts.
 *
 * @typeParam T - Entity schema type
 */
export abstract class BaseRepository<T> {
  /**
   * Initializes BaseRepository with target table schema and name.
   *
   * @param table - Drizzle ORM table schema object
   * @param tableName - SQL table name string
   */
  constructor(
    protected readonly table: any,
    protected readonly tableName: string
  ) {}

  /**
   * Finds a single record by its UUID primary key.
   *
   * @param id - Entity UUID
   * @returns Entity instance or null if not found or invalid UUID
   */
  async findById(id: string): Promise<T | null> {
    if (!id || !isUuid(id)) {
      return null;
    }
    const result = await db.select().from(this.table).where(eq(this.table.id, id));
    return (result[0] as T) || null;
  }

  /**
   * Finds paginated records ordered by created_at descending if available.
   *
   * @param limit - Maximum records to return (default: 20)
   * @param offset - Offset index (default: 0)
   * @returns Array of entity records
   */
  async findAll(limit = 20, offset = 0): Promise<T[]> {
    const orderBy = 'created_at' in this.table ? desc(this.table.created_at) : undefined;
    const query = db.select().from(this.table).limit(limit).offset(offset);
    if (orderBy) {
      query.orderBy(orderBy);
    }
    const result = await query;
    return result as T[];
  }

  /**
   * Returns total count of matching records.
   *
   * @param whereClause - Optional raw SQL WHERE clause
   * @param params - Optional parameter array for SQL injection prevention
   * @returns Total record count
   */
  async count(whereClause = '', params: unknown[] = []): Promise<number> {
    const query = whereClause
      ? `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) FROM ${this.tableName}`;
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Deletes a single record by its UUID.
   *
   * @param id - Entity UUID
   * @returns True if a row was deleted, false otherwise
   */
  async deleteById(id: string): Promise<boolean> {
    if (!id || !isUuid(id)) {
      return false;
    }
    const result = await db.delete(this.table).where(eq(this.table.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Executes a parameterized raw SQL query returning multiple rows.
   *
   * @typeParam R - Result row type (defaults to T)
   * @param sql - Raw SQL query string with parameter placeholders
   * @param params - Query parameters array
   * @returns Array of typed rows
   */
  protected async query<R = T>(sql: string, params: unknown[] = []): Promise<R[]> {
    const result = await pool.query(sql, params);
    return result.rows as R[];
  }

  /**
   * Executes a parameterized raw SQL query returning the first row.
   *
   * @typeParam R - Result row type (defaults to T)
   * @param sql - Raw SQL query string with parameter placeholders
   * @param params - Query parameters array
   * @returns First row or null
   */
  protected async queryOne<R = T>(sql: string, params: unknown[] = []): Promise<R | null> {
    const result = await pool.query(sql, params);
    return (result.rows[0] as R) || null;
  }
}
