import fs from 'fs';
import path from 'path';
import { PoolClient } from 'pg';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function checkTableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_name = $1
     )`,
    [tableName]
  );
  return res.rows[0].exists;
}

async function checkColumnExists(client: PoolClient, tableName: string, columnName: string): Promise<boolean> {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name = $1 
         AND column_name = $2
     )`,
    [tableName, columnName]
  );
  return res.rows[0].exists;
}

async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  logger.info(`Found ${files.length} migration file(s)`);

  const client = await pool.connect();

  try {
    // 1. Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Check if _migrations has any entries
    const countRes = await client.query('SELECT COUNT(*) FROM _migrations');
    const migrationCount = parseInt(countRes.rows[0].count, 10);

    if (migrationCount === 0) {
      logger.info('Migration tracking table is empty. Initializing based on current database state...');
      const usersExists = await checkTableExists(client, 'users');
      if (usersExists) {
        logger.info('Existing database detected. Backfilling migration log...');
        const migrationsToBackfill: string[] = [];

        // 001_initial_schema.sql
        migrationsToBackfill.push('001_initial_schema.sql');

        // 002_add_user_language.sql
        if (await checkColumnExists(client, 'users', 'language')) {
          migrationsToBackfill.push('002_add_user_language.sql');
        }

        // 003_add_multi_tenancy.sql
        if (await checkTableExists(client, 'tenants')) {
          migrationsToBackfill.push('003_add_multi_tenancy.sql');
        }

        // 004_add_ticket_responses.sql
        if (await checkTableExists(client, 'ticket_responses')) {
          migrationsToBackfill.push('004_add_ticket_responses.sql');
        }

        // 005_add_response_id_to_attachments.sql
        if (await checkColumnExists(client, 'ticket_attachments', 'response_id')) {
          migrationsToBackfill.push('005_add_response_id_to_attachments.sql');
        }

        // 006_create_notifications_table.sql
        if (await checkTableExists(client, 'notifications')) {
          migrationsToBackfill.push('006_create_notifications_table.sql');
        }

        // 007_create_notification_preferences_table.sql
        if (await checkTableExists(client, 'notification_preferences')) {
          migrationsToBackfill.push('007_create_notification_preferences_table.sql');
        }

        // 008_add_user_avatar.sql
        if (await checkColumnExists(client, 'users', 'avatar_url')) {
          migrationsToBackfill.push('008_add_user_avatar.sql');
        }

        // 009_add_last_login_fields.sql
        if (await checkColumnExists(client, 'users', 'last_login_at')) {
          migrationsToBackfill.push('009_add_last_login_fields.sql');
        }

        for (const file of migrationsToBackfill) {
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
          logger.info(`Recorded existing migration in log: ${file}`);
        }
      }
    }

    // 3. Fetch already applied migrations
    const appliedRes = await client.query('SELECT name FROM _migrations');
    const appliedMigrations = new Set<string>(appliedRes.rows.map((r) => r.name));

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        logger.info(`Skipping already applied migration: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      logger.info(`Running migration: ${file}`);
      
      // Start transaction for each migration file to be safe
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`✅ Migration complete: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
