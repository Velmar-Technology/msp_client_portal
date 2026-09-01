import { faker } from '@faker-js/faker';
import { db, pool } from './index';
import * as schema from './schema';
import { logger } from '@shared/utils/logger';

/** Default bcrypt password hash for 'password123' */
const DEFAULT_PASSWORD_HASH = '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO';

/** Pool of technician specialties including Tier 2 escalation specialists */
export const TECHNICIAN_SPECIALTIES = [
  'Networking',
  'Hardware & POS',
  'Cloud & Security',
  'Tier 2',
  'Tier 2 Specialist',
  'Cybersecurity',
  'Linux & Infrastructure',
  'Systems Administration',
  'Database & Storage',
  'VoIP & Telecom',
] as const;

/**
 * Seeds a batch of realistic MSP technicians into the database using Faker.js.
 *
 * @param count - Number of technician users to generate (defaults to 10)
 * @param tenantSubdomain - Subdomain of the MSP provider tenant (defaults to 'admin')
 * @returns Array of created technician objects
 * @throws {Error} If provider tenant is not found or database insertion fails
 */
export async function seedTechniciansWithFaker(
  count = 10,
  tenantSubdomain = 'admin',
): Promise<Array<{ id: string; name: string; email: string; specialty: string | null }>> {
  const tenants = await db.select().from(schema.tenants);
  const providerTenant = tenants.find((t) => t.subdomain === tenantSubdomain) || tenants[0];

  if (!providerTenant) {
    throw new Error(`No provider tenant found with subdomain "${tenantSubdomain}"`);
  }

  logger.info(`Seeding ${count} technicians for tenant "${providerTenant.name}" (${providerTenant.id})...`);

  const newTechnicians: Array<typeof schema.users.$inferInsert> = [];
  const newPreferences: Array<typeof schema.notificationPreferences.$inferInsert> = [];
  const createdSummary: Array<{ id: string; name: string; email: string; specialty: string | null }> = [];

  for (let i = 0; i < count; i++) {
    const id = faker.string.uuid();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanFirst}.${cleanLast}.${faker.string.alphanumeric(3).toLowerCase()}@msp-services.com`;
    const specialty = faker.helpers.arrayElement(TECHNICIAN_SPECIALTIES);
    const language = faker.helpers.arrayElement(['en_US', 'es_DO'] as const);
    const phoneNumber = faker.phone.number({ style: 'international' });

    newTechnicians.push({
      id,
      email,
      name,
      password_hash: DEFAULT_PASSWORD_HASH,
      role: 'TECHNICIAN',
      specialty,
      is_active: true,
      email_verified: true,
      language,
      client_type: 'CLIENT',
      phone_number: phoneNumber,
      tenant_id: providerTenant.id,
    });

    newPreferences.push({
      id: faker.string.uuid(),
      user_id: id,
      tenant_id: providerTenant.id,
      preferences: {
        TICKET_CREATED: { in_app: true, email: true, whatsapp: false },
        TICKET_ASSIGNED: { in_app: true, email: true, whatsapp: true },
        TICKET_STATUS_CHANGED: { in_app: true, email: true, whatsapp: true },
        TICKET_CANCELLED: { in_app: true, email: true, whatsapp: false },
        NEW_REPLY: { in_app: true, email: true, whatsapp: true },
      },
    });

    createdSummary.push({ id, name, email, specialty });
  }

  await db.insert(schema.users).values(newTechnicians);
  await db.insert(schema.notificationPreferences).values(newPreferences);

  logger.info(`Successfully seeded ${count} technicians with Faker.js!`);
  return createdSummary;
}

// Allow direct execution from CLI (e.g., npm -w server run db:seed:technicians or tsx seedTechnicians.ts [count])
if (require.main === module || process.argv[1]?.includes('seedTechnicians')) {
  const countArg = parseInt(process.argv[2], 10);
  const count = !isNaN(countArg) && countArg > 0 ? countArg : 10;

  seedTechniciansWithFaker(count)
    .then((technicians) => {
      console.log('\n--- Seeded Technicians ---');
      technicians.forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.name} (${t.email}) - Specialty: [${t.specialty}]`);
      });
      console.log('--------------------------\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Failed to seed technicians:', err);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}
