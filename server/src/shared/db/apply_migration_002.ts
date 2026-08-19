import fs from 'fs';
import path from 'path';
import { pool } from '@shared/config/database';
import { logger } from '@shared/utils/logger';

async function applyMigration() {
  const filePath = path.join(__dirname, 'migrations', '002_add_user_language.sql');
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  logger.info(`Running migration: 002_add_user_language.sql`);
  const client = await pool.connect();
  try {
    await client.query(sql);
    logger.info(`✅ Database altered successfully: added language column to users table.`);
  } catch (error) {
    logger.error('Failed to run migration', { error });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
