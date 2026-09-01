import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import { db, pool } from './index';
import * as schema from './schema';
import { logger } from '@shared/utils/logger';

// Deterministic seed for reproducible mock dataset
faker.seed(2026);

const CHUNK_SIZE = 1000;

/**
 * Splits an array into sub-arrays of specified chunk size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Inserts records in chunks of 1,000 using Drizzle ORM
 */
async function insertChunked<T>(
  tableName: string,
  table: any,
  records: T[],
  chunkSize = CHUNK_SIZE
): Promise<void> {
  if (records.length === 0) return;

  const chunks = chunkArray(records, chunkSize);
  logger.info(`Inserting ${records.length} records into ${tableName} across ${chunks.length} chunk(s)...`);

  for (const chunk of chunks) {
    await db.insert(table).values(chunk as any);
  }
}

/**
 * High-volume Faker.js Seeder using Drizzle ORM
 */
export async function seedWithFaker(): Promise<void> {
  const client = await pool.connect();

  try {
    logger.info('Starting high-volume Faker.js database seeding with Drizzle ORM...');

    // 1. First run foundational seed.sql for baseline schema integrity & catalog
    const seedSqlPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedSqlPath)) {
      logger.info('Applying baseline schema seed (seed.sql)...');
      const baseSql = fs.readFileSync(seedSqlPath, 'utf-8');
      await client.query(baseSql);
      logger.info('Baseline seed applied successfully');
    }

    // 2. Query existing baseline IDs to preserve integrity
    const existingTenants = await db.select().from(schema.tenants);
    const existingUsers = await db.select().from(schema.users);
    const existingPlans = await db.select().from(schema.plans);

    const providerTenantId = existingTenants.find((t) => t.subdomain === 'admin')?.id || existingTenants[0].id;
    const techUserIds = existingUsers.filter((u) => u.role === 'TECHNICIAN').map((u) => u.id);
    const adminUserId = existingUsers.find((u) => u.role === 'ADMIN')?.id || existingUsers[0].id;
    const planIds = existingPlans.map((p) => p.id);

    // Shared default password hash ('password123')
    const defaultPasswordHash = '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO';

    // 3. Generate Bulk Tenants (50 corporate tenants)
    const newTenants: Array<typeof schema.tenants.$inferInsert> = [];
    const clientTenants: Array<{ id: string; name: string }> = [];

    for (let i = 0; i < 50; i++) {
      const id = faker.string.uuid();
      const company = faker.company.name();
      const cleanSubdomain = faker.helpers
        .slugify(company)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 25) + `-${i + 1}`;

      newTenants.push({
        id,
        name: company,
        subdomain: cleanSubdomain,
      });
      clientTenants.push({ id, name: company });
    }
    await insertChunked('tenants', schema.tenants, newTenants);

    // 3.5 Generate Bulk Technicians (20 MSP Technicians with diverse specialties)
    const technicianSpecialties = [
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
    ];

    const newTechnicians: Array<typeof schema.users.$inferInsert> = [];
    const newTechPreferences: Array<typeof schema.notificationPreferences.$inferInsert> = [];

    for (let i = 0; i < 20; i++) {
      const id = faker.string.uuid();
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const name = `${firstName} ${lastName}`;
      const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${cleanFirst}.${cleanLast}.${i + 1}@msp-services.com`;
      const specialty = faker.helpers.arrayElement(technicianSpecialties);

      newTechnicians.push({
        id,
        email,
        name,
        password_hash: defaultPasswordHash,
        role: 'TECHNICIAN',
        specialty,
        is_active: true,
        email_verified: true,
        language: faker.helpers.arrayElement(['en_US', 'es_DO']),
        client_type: 'CLIENT',
        phone_number: faker.phone.number({ style: 'international' }),
        tenant_id: providerTenantId,
      });

      newTechPreferences.push({
        id: faker.string.uuid(),
        user_id: id,
        tenant_id: providerTenantId,
        preferences: {
          TICKET_CREATED: { in_app: true, email: true, whatsapp: false },
          TICKET_ASSIGNED: { in_app: true, email: true, whatsapp: true },
          TICKET_STATUS_CHANGED: { in_app: true, email: true, whatsapp: true },
          TICKET_CANCELLED: { in_app: true, email: true, whatsapp: false },
          NEW_REPLY: { in_app: true, email: true, whatsapp: true },
        },
      });

      techUserIds.push(id);
    }
    await insertChunked('users (technicians)', schema.users, newTechnicians);
    await insertChunked('notification_preferences', schema.notificationPreferences, newTechPreferences);

    // 4. Generate Bulk Users (250 users matched to tenants)
    const newUsers: Array<typeof schema.users.$inferInsert> = [];
    const clientUsers: Array<{ id: string; tenantId: string; name: string; email: string }> = [];

    for (let i = 0; i < 250; i++) {
      const id = faker.string.uuid();
      const targetTenant = faker.helpers.arrayElement(clientTenants);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `user_${i + 1}_${faker.string.alphanumeric(4)}@${targetTenant.id.slice(0, 8)}.msp`;
      const name = `${firstName} ${lastName}`;

      newUsers.push({
        id,
        email,
        name,
        password_hash: defaultPasswordHash,
        role: 'CLIENT',
        is_active: true,
        email_verified: true,
        language: faker.helpers.arrayElement(['en_US', 'es_DO']),
        client_type: faker.helpers.arrayElement(['ENTERPRISE', 'CLIENT', 'STUDENT', 'OTHER']),
        phone_number: faker.phone.number({ style: 'international' }),
        tenant_id: targetTenant.id,
      });

      clientUsers.push({ id, tenantId: targetTenant.id, name, email });
    }
    await insertChunked('users', schema.users, newUsers);

    // 5. Generate Bulk Subscriptions (200 subscriptions, exactly 5 device slots each = 1,000 devices)
    const newSubscriptions: Array<typeof schema.subscriptions.$inferInsert> = [];
    const createdSubs: Array<{ id: string; clientId: string; tenantId: string; equipmentCount: number }> = [];

    for (let i = 0; i < 200; i++) {
      const id = faker.string.uuid();
      const user = faker.helpers.arrayElement(clientUsers);
      const plan = faker.helpers.arrayElement(planIds);
      const equipCount = 5; // 200 * 5 = 1,000 devices

      newSubscriptions.push({
        id,
        client_id: user.id,
        service_name: faker.helpers.arrayElement([
          'Managed IT Endpoint Care',
          'Proactive RMM & Cloud Backup',
          'Enterprise Cybersecurity Monitoring',
          'POS Terminal High-Availability Service',
          'Cloud Sync & Identity Suite',
        ]),
        plan,
        status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRING', 'EXPIRED']),
        renewal_date: faker.date.future({ years: 1 }),
        equipment_count: equipCount,
        tenant_id: user.tenantId,
      });

      createdSubs.push({ id, clientId: user.id, tenantId: user.tenantId, equipmentCount: equipCount });
    }
    await insertChunked('subscriptions', schema.subscriptions, newSubscriptions);

    // 6. Generate Bulk Subscription Equipment (1,000 devices with unique slot_index per subscription)
    const newEquipment: Array<typeof schema.subscriptionEquipment.$inferInsert> = [];
    const createdEquip: Array<{ id: string; tenantId: string; hostname: string }> = [];

    const deviceModels = [
      'Dell Latitude 7420 FHD',
      'Dell Precision 5820 Workstation',
      'Apple MacBook Pro 16" M3',
      'Apple Mac Studio M2 Max',
      'Lenovo ThinkPad T14 Gen 4',
      'Lenovo ThinkCentre M70q Tiny',
      'HP EliteBook 840 G9',
      'HPE ProLiant DL380 Gen10 Server',
      'NCR RealPOS XR7 Plus POS',
      'Microsoft Surface Laptop Studio 2',
    ];

    let deviceIndex = 0;
    for (const sub of createdSubs) {
      for (let slot = 0; slot < sub.equipmentCount; slot++) {
        deviceIndex++;
        const id = faker.string.uuid();
        const hostname = `WS-${String(deviceIndex).padStart(5, '0')}`;
        const serial = `SN-${faker.string.alphanumeric(10).toUpperCase()}`;

        newEquipment.push({
          id,
          subscription_id: sub.id,
          slot_index: slot,
          status: 'ACTIVE',
          device_name: `${faker.helpers.arrayElement(deviceModels)} (${hostname})`,
          device_serial: serial,
          agent_instance_id: faker.string.uuid(),
          agent_hostname: hostname,
          agent_serial: serial,
          agent_last_seen_at: faker.date.recent({ days: 2 }),
          agent_token: `tok_${faker.string.alphanumeric(16)}`,
          nextcloud_username: `user_${deviceIndex}_${faker.string.alphanumeric(6).toLowerCase()}`,
          nextcloud_password: 'cloud_pass_123',
          tenant_id: sub.tenantId,
        });

        createdEquip.push({ id, tenantId: sub.tenantId, hostname });
      }
    }
    await insertChunked('subscription_equipment', schema.subscriptionEquipment, newEquipment);

    // 7. Generate Bulk RMM Device Telemetry (1,000 telemetry rows, 1:1 with equipment)
    const newTelemetry: Array<typeof schema.rmmDeviceTelemetry.$inferInsert> = [];
    for (let i = 0; i < createdEquip.length; i++) {
      const eq = createdEquip[i];
      const diskTotal = faker.helpers.arrayElement([250, 500, 1000, 2000]);
      const diskUsage = faker.number.float({ min: 15, max: 92, fractionDigits: 2 });
      const diskUsed = Number(((diskTotal * diskUsage) / 100).toFixed(2));

      newTelemetry.push({
        id: faker.string.uuid(),
        equipment_id: eq.id,
        zabbix_host_id: `zbx-${20000 + i}`,
        agent_status: faker.helpers.weightedArrayElement([
          { weight: 85, value: 'ONLINE' },
          { weight: 10, value: 'WARNING' },
          { weight: 5, value: 'OFFLINE' },
        ]),
        cpu_usage: faker.number.float({ min: 2, max: 88, fractionDigits: 2 }),
        memory_usage: faker.number.float({ min: 20, max: 90, fractionDigits: 2 }),
        disk_usage: diskUsage,
        disk_used_gb: diskUsed,
        disk_total_gb: diskTotal,
        pending_patch_count: faker.number.int({ min: 0, max: 6 }),
        last_sync_at: faker.date.recent({ days: 1 }),
        tenant_id: eq.tenantId,
      });
    }
    await insertChunked('rmm_device_telemetry', schema.rmmDeviceTelemetry, newTelemetry);

    // 8. Generate Bulk RMM Patches (2,000 patch records)
    const patchCatalog = [
      { id: 'KB5034441', title: 'Windows 11 Cumulative Security Update 23H2', severity: 'HIGH' },
      { id: 'KB5034123', title: '.NET Framework 4.8.1 Security Rollup', severity: 'MEDIUM' },
      { id: 'CVE-2024-21626', title: 'Linux Kernel RunC Container Escape Fix', severity: 'CRITICAL' },
      { id: 'APPLE-SEC-14.4', title: 'macOS Sonoma 14.4.1 Security Update', severity: 'HIGH' },
      { id: 'NVD-2024-551', title: 'NVIDIA Studio Display Driver 551.76', severity: 'LOW' },
      { id: 'DELL-BIOS-2026', title: 'Dell Latitude System BIOS Firmware Update', severity: 'MEDIUM' },
    ];

    const newPatches: Array<typeof schema.rmmPatches.$inferInsert> = [];
    for (let i = 0; i < 2000; i++) {
      const patch = faker.helpers.arrayElement(patchCatalog);
      const eq = faker.helpers.arrayElement(createdEquip);
      const status = faker.helpers.arrayElement(['PENDING', 'INSTALLED', 'APPROVED']);

      newPatches.push({
        id: faker.string.uuid(),
        equipment_id: eq.id,
        patch_id: `${patch.id}-${i % 100}`,
        title: patch.title,
        severity: patch.severity,
        status,
        release_date: faker.date.recent({ days: 45 }),
        installed_at: status === 'INSTALLED' ? faker.date.recent({ days: 10 }) : null,
        tenant_id: eq.tenantId,
      });
    }
    await insertChunked('rmm_patches', schema.rmmPatches, newPatches);

    // 9. Generate Bulk RMM Alerts (1,000 alerts)
    const alertTypes = ['HIGH_CPU_LOAD', 'LOW_DISK_SPACE', 'DEVICE_OFFLINE_WARNING', 'SERVICE_CRASH', 'FLAPPING_ALERT'];
    const newAlerts: Array<typeof schema.rmmAlerts.$inferInsert> = [];
    for (let i = 0; i < 1000; i++) {
      const eq = faker.helpers.arrayElement(createdEquip);
      newAlerts.push({
        id: faker.string.uuid(),
        alert_type: faker.helpers.arrayElement(alertTypes),
        asset_id: eq.hostname,
        received_at: faker.date.recent({ days: 7 }),
        tenant_id: eq.tenantId,
      });
    }
    await insertChunked('rmm_alerts', schema.rmmAlerts, newAlerts);

    // 10. Generate Bulk Device Maintenances (1,000 maintenance tasks)
    const newMaintenances: Array<typeof schema.deviceMaintenances.$inferInsert> = [];
    for (let i = 0; i < 1000; i++) {
      const sub = faker.helpers.arrayElement(createdSubs);
      const eq = faker.helpers.arrayElement(createdEquip);
      const tech = faker.helpers.arrayElement([null, ...techUserIds]);

      newMaintenances.push({
        id: faker.string.uuid(),
        equipment_id: eq.id,
        subscription_id: sub.id,
        client_id: sub.clientId,
        tenant_id: sub.tenantId,
        assigned_tech_id: tech,
        scheduled_date: faker.date.soon({ days: 90 }),
        status: faker.helpers.arrayElement(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']),
        title: faker.helpers.arrayElement([
          'Semiannual Thermal Cleaning & Fan Inspection',
          'Disk Storage Pool & Health Consistency Audit',
          'OS Security Audit & Driver Suite Update',
          'POS Touchscreen & Peripheral Calibration',
        ]),
        notes: faker.lorem.sentence(),
        maintenance_type: faker.helpers.arrayElement(['PREDEFINED_6M', 'ON_DEMAND', 'FIRMWARE_UPDATE']),
        created_by: adminUserId,
      });
    }
    await insertChunked('device_maintenances', schema.deviceMaintenances, newMaintenances);

    // 11. Generate Bulk Tickets (1,000 tickets matched to client user + tenant)
    const ticketCategories = ['REPAIR', 'WARRANTY', 'SERVICE_OUTAGE', 'PREVENTATIVE_MAINTENANCE'] as const;
    const ticketStatuses = ['OPEN', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'RESOLVED', 'RESOLVED_AUTOMATED', 'CLOSED', 'CANCELLED'] as const;
    const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

    const newTickets: Array<typeof schema.tickets.$inferInsert> = [];
    const createdTickets: Array<{ id: string; clientId: string; tenantId: string }> = [];

    for (let i = 0; i < 1000; i++) {
      const id = faker.string.uuid();
      const user = faker.helpers.arrayElement(clientUsers);
      const tech = faker.helpers.arrayElement([null, ...techUserIds]);
      const eq = faker.helpers.arrayElement([null, ...createdEquip]);

      newTickets.push({
        id,
        title: faker.helpers.arrayElement([
          'Network latency and packet dropouts during nightly backup',
          'Cracked LCD screen and hinge replacement needed',
          'Barcode scanner USB controller failing to respond',
          'Kernel security vulnerability patch verification',
          'Outlook desktop synchronization timeout with Exchange',
          'Workstation thermal throttling under compute workload',
          'Storage array RAID consistency scan report warning',
        ]),
        description: faker.lorem.paragraph({ min: 2, max: 4 }),
        category: faker.helpers.arrayElement(ticketCategories),
        status: faker.helpers.arrayElement(ticketStatuses),
        priority: faker.helpers.arrayElement(ticketPriorities),
        client_id: user.id,
        assigned_tech_id: tech,
        equipment_id: eq ? eq.id : null,
        tenant_id: user.tenantId,
        created_at: faker.date.recent({ days: 60 }),
      });

      createdTickets.push({ id, clientId: user.id, tenantId: user.tenantId });
    }
    await insertChunked('tickets', schema.tickets, newTickets);

    // 12. Generate Bulk Ticket Events & Responses (2,000 events, 2,000 replies)
    const newEvents: Array<typeof schema.ticketEvents.$inferInsert> = [];
    const newResponses: Array<typeof schema.ticketResponses.$inferInsert> = [];

    for (let i = 0; i < 2000; i++) {
      const ticket = faker.helpers.arrayElement(createdTickets);
      const techId = faker.helpers.arrayElement(techUserIds);

      newEvents.push({
        id: faker.string.uuid(),
        ticket_id: ticket.id,
        old_status: 'OPEN',
        new_status: faker.helpers.arrayElement(['IN_PROGRESS', 'RESOLVED', 'AWAITING_PAYMENT']),
        changed_by: techId,
        notes: faker.lorem.sentence(),
        tenant_id: ticket.tenantId,
        created_at: faker.date.recent({ days: 30 }),
      });

      newResponses.push({
        id: faker.string.uuid(),
        ticket_id: ticket.id,
        user_id: i % 2 === 0 ? ticket.clientId : techId,
        message: faker.lorem.sentences({ min: 1, max: 3 }),
        tenant_id: ticket.tenantId,
        created_at: faker.date.recent({ days: 30 }),
      });
    }
    await insertChunked('ticket_events', schema.ticketEvents, newEvents);
    await insertChunked('ticket_responses', schema.ticketResponses, newResponses);

    // 13. Generate Bulk Invoices & Expenses (1,000 invoices, 500 expenses)
    const newInvoices: Array<typeof schema.invoices.$inferInsert> = [];
    for (let i = 0; i < 1000; i++) {
      const user = faker.helpers.arrayElement(clientUsers);
      const amount = faker.number.float({ min: 50, max: 2500, fractionDigits: 2 });
      const tax = Number((amount * 0.18).toFixed(2));
      const total = Number((amount + tax).toFixed(2));

      newInvoices.push({
        id: faker.string.uuid(),
        invoice_number: `INV-2026-${String(10000 + i).padStart(6, '0')}`,
        client_id: user.id,
        amount,
        tax_amount: tax,
        total,
        status: faker.helpers.arrayElement(['PAID', 'PENDING', 'OVERDUE', 'CANCELLED']),
        invoice_date: faker.date.recent({ days: 120 }),
        due_date: faker.date.soon({ days: 30 }),
        tenant_id: user.tenantId,
      });
    }
    await insertChunked('invoices', schema.invoices, newInvoices);

    const newExpenses: Array<typeof schema.expenses.$inferInsert> = [];
    for (let i = 0; i < 500; i++) {
      newExpenses.push({
        id: faker.string.uuid(),
        amount: faker.number.float({ min: 25, max: 1200, fractionDigits: 2 }),
        description: faker.helpers.arrayElement([
          'Cloud Backup Storage S3 Egress & Storage',
          'OEM Hardware Spare LCD & Hinge Stock',
          'Technician Field Dispatch Fuel & Tolls',
          'Zabbix Enterprise Telemetry Ingestion Node',
          'Microsoft Partner Cloud Seat Allocation',
        ]),
        category: faker.helpers.arrayElement(['Software & SaaS', 'Hardware Inventory', 'Travel & Operations', 'Facilities']),
        expense_date: faker.date.recent({ days: 90 }),
        expense_identifier: `EXP-2026-${String(1000 + i).padStart(5, '0')}`,
        tenant_id: providerTenantId,
      });
    }
    await insertChunked('expenses', schema.expenses, newExpenses);

    // 14. Generate Bulk CRM Leads, Quotations & Activities (500 leads, 250 quotes, 1,000 activities)
    const newLeads: Array<typeof schema.leads.$inferInsert> = [];
    const createdLeads: Array<{ id: string }> = [];

    for (let i = 0; i < 500; i++) {
      const id = faker.string.uuid();
      const equipCount = faker.number.int({ min: 2, max: 40 });
      const plan = faker.helpers.arrayElement(planIds);
      const stage = faker.helpers.arrayElement(['NEW', 'QUALIFIED', 'PROPOSITION', 'WON', 'LOST'] as const);

      newLeads.push({
        id,
        tenant_id: providerTenantId,
        contact_name: faker.person.fullName(),
        contact_email: `lead_${i + 1}_${faker.string.alphanumeric(4)}@test-crm.do`,
        contact_phone: faker.phone.number({ style: 'international' }),
        company_name: faker.company.name(),
        stage,
        plan_id: plan,
        billing_cycle: faker.helpers.arrayElement(['monthly', 'annual']),
        equipment_count: equipCount,
        expected_revenue: faker.number.float({ min: 100, max: 4500, fractionDigits: 2 }),
        probability: stage === 'WON' ? 100 : stage === 'LOST' ? 0 : faker.number.int({ min: 10, max: 90 }),
        priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH'] as const),
        assigned_user_id: adminUserId,
        notes: faker.lorem.paragraph({ min: 1, max: 2 }),
      });

      createdLeads.push({ id });
    }
    await insertChunked('leads', schema.leads, newLeads);

    const newQuotations: Array<typeof schema.quotations.$inferInsert> = [];
    for (let i = 0; i < 250; i++) {
      const subtotal = faker.number.float({ min: 200, max: 5000, fractionDigits: 2 });
      const tax = Number((subtotal * 0.18).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));

      newQuotations.push({
        id: faker.string.uuid(),
        quotation_number: `QT-2026-${String(10000 + i).padStart(6, '0')}`,
        tenant_id: providerTenantId,
        lead_id: faker.helpers.arrayElement(createdLeads).id,
        recipient_name: faker.person.fullName(),
        recipient_email: `quote_${i + 1}@test-client.do`,
        plan_id: faker.helpers.arrayElement(planIds),
        billing_cycle: faker.helpers.arrayElement(['monthly', 'annual']),
        equipment_count: faker.number.int({ min: 1, max: 30 }),
        subtotal,
        tax,
        total,
        status: faker.helpers.arrayElement(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const),
        valid_until: faker.date.soon({ days: 30 }),
        sent_at: faker.date.recent({ days: 30 }),
        created_by: adminUserId,
      });
    }
    await insertChunked('quotations', schema.quotations, newQuotations);

    const newActivities: Array<typeof schema.leadActivities.$inferInsert> = [];
    for (let i = 0; i < 1000; i++) {
      newActivities.push({
        id: faker.string.uuid(),
        lead_id: faker.helpers.arrayElement(createdLeads).id,
        tenant_id: providerTenantId,
        user_id: adminUserId,
        activity_type: faker.helpers.arrayElement(['CALL', 'EMAIL', 'MEETING', 'DEMO', 'NOTE']),
        title: faker.helpers.arrayElement([
          'Executive Discovery Call',
          'SLA & Security Review Presentation',
          'Contract Proposal Follow-up',
          'Technical Readiness Assessment',
          'Billing & Seat Reconciliation Call',
        ]),
        summary: faker.lorem.paragraph({ min: 1, max: 2 }),
        due_date: faker.date.soon({ days: 14 }),
        completed_at: faker.date.recent({ days: 14 }),
        status: faker.helpers.arrayElement(['PENDING', 'COMPLETED']),
      });
    }
    await insertChunked('lead_activities', schema.leadActivities, newActivities);

    logger.info('High-volume Faker.js database seeding finished successfully!');
  } catch (error) {
    console.error('[Faker] Seeding failed:', error);
    logger.error('Faker seeding failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run directly if invoked via CLI
if (require.main === module || process.argv[1]?.includes('seedFaker')) {
  seedWithFaker().catch(() => process.exit(1));
}
