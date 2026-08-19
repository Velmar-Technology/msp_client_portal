import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '@shared/config/database';
import * as schema from './schema';

export const db = drizzle(pool, { schema });
export * from './schema';
export { pool };
