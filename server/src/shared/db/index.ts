import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '@shared/config/database';
import * as coreSchema from './schema';
import * as moduleSchemas from './schemas.generated';

const schema = {
  ...coreSchema,
  ...moduleSchemas,
};

export const db = drizzle(pool, { schema });
export * from './schema';
export * from './schemas.generated';
export { pool };
export { withRetry, getPoolHealth } from '@shared/config/database';
export type { PoolHealth, PoolHealth as PoolHealthStatus } from '@shared/config/database';
