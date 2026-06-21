import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function resetDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Resetting database schema (dropping and recreating public schema)...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    logger.info('Schema reset complete.');

    // 1. Run migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    logger.info(`Found ${files.length} migration file(s)`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      logger.info(`Running migration: ${file}`);
      await client.query(sql);
      logger.info(`✅ Migration complete: ${file}`);
    }

    // 2. Seed database
    const seedFile = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedFile, 'utf-8');
    logger.info('Seeding database...');
    await client.query(seedSql);
    logger.info('✅ Database seeded successfully');

  } catch (error) {
    logger.error('❌ Database reset failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
