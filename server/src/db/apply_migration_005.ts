import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function applyMigration() {
  const filePath = path.join(__dirname, 'migrations', '005_add_response_id_to_attachments.sql');
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  logger.info(`Running migration: 005_add_response_id_to_attachments.sql`);
  const client = await pool.connect();
  try {
    await client.query(sql);
    logger.info(`✅ Database altered successfully: response_id column added to ticket_attachments.`);
  } catch (error) {
    logger.error('Failed to run migration', { error });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
