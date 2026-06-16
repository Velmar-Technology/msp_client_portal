import { pool } from '../config/database';
import { QueryResult } from 'pg';

/**
 * Generic base repository providing reusable CRUD operations.
 * All repositories extend this to inherit common data access patterns.
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly tableName: string) {}

  async findById(id: string): Promise<T | null> {
    const result: QueryResult = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return (result.rows[0] as T) || null;
  }

  async findAll(limit = 20, offset = 0): Promise<T[]> {
    const result: QueryResult = await pool.query(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows as T[];
  }

  async count(whereClause = '', params: unknown[] = []): Promise<number> {
    const query = whereClause
      ? `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) FROM ${this.tableName}`;
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
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
