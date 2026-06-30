import fs from 'fs';
import path from 'path';
import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { env } from '../config/env';
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

export async function ensureAdminExists(client: PoolClient): Promise<void> {
  logger.info('Checking if an administrator user exists...');
  
  // Check if any admin exists
  const adminCheck = await client.query(
    "SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1"
  );
  
  if (adminCheck.rows.length > 0) {
    logger.info('At least one administrator user already exists in the database.');
    return;
  }
  
  logger.info('No administrator user found. Creating default administrator...');

  // Check if default admin tenant exists, otherwise create it
  let tenantId = 'ef010203-0405-0607-0809-0a0b0c0d0e0f';
  const tenantCheck = await client.query(
    "SELECT id FROM tenants WHERE subdomain = 'admin' OR id = $1 LIMIT 1",
    [tenantId]
  );

  if (tenantCheck.rows.length > 0) {
    tenantId = tenantCheck.rows[0].id;
    logger.info(`Using existing admin tenant with ID: ${tenantId}`);
  } else {
    logger.info('Creating default admin tenant...');
    await client.query(
      "INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)",
      [tenantId, 'MSP Provider', 'admin']
    );
  }

  // Check if a user with the admin email exists (could be a CLIENT or TECHNICIAN)
  const userCheck = await client.query(
    "SELECT id, role FROM users WHERE email = $1 LIMIT 1",
    [env.ADMIN_EMAIL]
  );

  if (userCheck.rows.length > 0) {
    // User exists. If not already an ADMIN, update role to ADMIN
    if (userCheck.rows[0].role !== 'ADMIN') {
      logger.info(`User with email ${env.ADMIN_EMAIL} exists with role ${userCheck.rows[0].role}. Upgrading to ADMIN...`);
      await client.query(
        "UPDATE users SET role = 'ADMIN' WHERE id = $1",
        [userCheck.rows[0].id]
      );
    } else {
      logger.info(`User with email ${env.ADMIN_EMAIL} is already an ADMIN.`);
    }
  } else {
    // User does not exist. Create new admin user
    logger.info(`Creating new administrator user with email: ${env.ADMIN_EMAIL}`);
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await client.query(
      "INSERT INTO users (email, name, password_hash, role, tenant_id, is_active, email_verified) VALUES ($1, $2, $3, 'ADMIN', $4, true, true)",
      [env.ADMIN_EMAIL, 'System Administrator', passwordHash, tenantId]
    );
  }
}

export async function migrate(): Promise<void> {
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

    // Ensure at least one administrator user is created
    await ensureAdminExists(client);

    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(() => process.exit(1));
}
