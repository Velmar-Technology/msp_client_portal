import fs from 'fs';
import path from 'path';
import { pool } from '@shared/config/database';
import { logger } from '@shared/utils/logger';

async function seed(): Promise<void> {
  const seedFile = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedFile, 'utf-8');

  const client = await pool.connect();

  try {
    logger.info('Seeding database...');
    await client.query(sql);
    logger.info('✅ Database seeded successfully');
  } catch (error) {
    logger.error('Seeding failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
