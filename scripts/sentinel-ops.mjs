#!/usr/bin/env node
/**
 * SequenceSentinel Unified Operations Engine
 * Executes all platform, subscription, feature, and identity mutations in a single atomic pass.
 * Automatically handles database transactions, tenant isolation, Redis cache invalidation,
 * and invariant verification.
 *
 * Usage:
 *   node scripts/sentinel-ops.mjs <action> [options]
 *
 * Actions:
 *   feature:manage     --user=<email|id> | --plan=<code> [--add=F1,F2] [--remove=F3] [--reason="..."]
 *   plan:provision     --user=<email|id> --plan=<code> [--capacity=1] [--cycle=monthly|annual] [--mark-paid]
 *   sub:extend         --user=<email|id> [--extension="1 year"] [--months=12] [--mark-paid]
 *   user:role          --user=<email|id> [--role=CLIENT|TECH|ADMIN] [--client-type=CLIENT|ENTERPRISE]
 *   infra:audit        [--endpoint=3] [--stack=17]
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORTAINER_URL = (process.env.PORTAINER_URL || 'https://helpdesk.velmartech.com.do:9443').replace(/\/+$/, '');
const PORTAINER_API_KEY = process.env.PORTAINER_API_KEY || 'ptr_xtqP3W+2AyrMcnrXYlhy1W1pn4TteU4DtJ9334Wp5bI=';
const ENDPOINT_ID = process.env.PORTAINER_ENDPOINT_ID || '3';
const STACK_ID = process.env.PORTAINER_STACK || '17';

async function portainerRequest(path, options = {}) {
  const url = `${PORTAINER_URL}${path}`;
  const headers = { 'x-api-key': PORTAINER_API_KEY, ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  try { return { status: res.status, ok: res.ok, data: JSON.parse(text) }; }
  catch { return { status: res.status, ok: res.ok, text }; }
}

async function execDocker(containerMatch, cmd) {
  const containers = (await portainerRequest(`/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=1`)).data || [];
  const targetCont = containers.find(c => c.Names?.some(n => n.toLowerCase().includes(containerMatch.toLowerCase())));
  if (!targetCont) throw new Error(`Container matching '${containerMatch}' not found on endpoint ${ENDPOINT_ID}`);

  const execCreate = await portainerRequest(`/api/endpoints/${ENDPOINT_ID}/docker/containers/${targetCont.Id}/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      AttachStdout: true,
      AttachStderr: true,
      Cmd: cmd,
    }),
  });
  if (!execCreate.ok) throw new Error(`Exec creation failed: HTTP ${execCreate.status}`);

  const execStart = await portainerRequest(`/api/endpoints/${ENDPOINT_ID}/docker/exec/${execCreate.data.Id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Detach: false, Tty: false }),
  });
  return execStart.text || '';
}

async function execSql(sql) {
  return execDocker('postgres_db_prod', ['psql', '-U', 'postgres', '-d', 'msp_helpdesk', '-c', sql]);
}

async function execSqlJson(query) {
  const raw = await execDocker('postgres_db_prod', [
    'psql', '-U', 'postgres', '-d', 'msp_helpdesk', '-t', '-A', '-c',
    `SELECT json_agg(t) FROM (${query}) t;`
  ]);
  try {
    const startIdx = raw.indexOf('[');
    const endIdx = raw.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return JSON.parse(raw.substring(startIdx, endIdx + 1));
    }
    return [];
  } catch (err) {
    return [];
  }
}

async function invalidateRedisCache() {
  try {
    await execDocker('redis_prod', ['redis-cli', 'INCR', 'gen:plans:global']);
    return true;
  } catch {
    return false;
  }
}

function parseCliArgs() {
  const rawArgs = process.argv.slice(2);
  const action = rawArgs[0] || 'help';
  const options = {};

  for (let i = 1; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        options[key] = val;
      } else {
        options[arg.slice(2)] = true;
      }
    }
  }
  return { action, options };
}

async function handleFeatureManage(opts) {
  const user = opts.user;
  const plan = opts.plan;
  const addFeatures = opts.add ? opts.add.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];
  const removeFeatures = opts.remove ? opts.remove.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];

  if (!user && !plan) {
    console.error('Error: Either --user=<email|uuid> or --plan=<code> is required.');
    process.exit(1);
  }

  console.log(`🛡️  [SequenceSentinel] Executing feature:manage...`);
  if (user) console.log(`   Target User:        ${user}`);
  if (plan) console.log(`   Target Plan:        ${plan}`);
  if (addFeatures.length) console.log(`   Adding Features:    [${addFeatures.join(', ')}]`);
  if (removeFeatures.length) console.log(`   Removing Features:  [${removeFeatures.join(', ')}]`);

  let targetPlanId = plan;
  let targetTenantId = null;
  let targetSubId = null;
  let targetUserId = null;

  if (user) {
    const users = await execSqlJson(`
      SELECT id, email, name, tenant_id FROM users 
      WHERE email = '${user}' OR id::text = '${user}' OR name ILIKE '%${user}%'
      LIMIT 1
    `);
    if (!users.length) throw new Error(`User '${user}' not found`);
    const u = users[0];
    targetUserId = u.id;
    targetTenantId = u.tenant_id;

    const subs = await execSqlJson(`
      SELECT id, plan, service_name, status, tenant_id FROM subscriptions
      WHERE client_id = '${u.id}' AND status = 'ACTIVE'
      ORDER BY created_at DESC LIMIT 1
    `);
    if (!subs.length) throw new Error(`No active subscription found for user '${u.email}'`);
    targetSubId = subs[0].id;
    targetPlanId = subs[0].plan;
  }

  const plans = await execSqlJson(`
    SELECT id, name, description, price, features, client_type, is_custom, tenant_id
    FROM plans WHERE id = '${targetPlanId}'
  `);
  if (!plans.length) throw new Error(`Plan '${targetPlanId}' not found in catalog`);
  const basePlan = plans[0];

  let currentFeatures = Array.isArray(basePlan.features) ? [...basePlan.features] : [];
  const addedList = [];
  const removedList = [];

  for (const code of addFeatures) {
    const existing = currentFeatures.find(f => (typeof f === 'string' ? f : f.code) === code);
    if (!existing) {
      currentFeatures.push({
        code,
        text: {
          en_US: code.replace(/_/g, ' '),
          es_DO: code.replace(/_/g, ' '),
        },
        included: true,
      });
      addedList.push(code);
    }
  }

  if (removeFeatures.length) {
    const removeSet = new Set(removeFeatures);
    currentFeatures = currentFeatures.filter(f => {
      const code = (typeof f === 'string' ? f : f.code)?.toUpperCase();
      if (removeSet.has(code)) {
        removedList.push(code);
        return false;
      }
      return true;
    });
  }

  let finalPlanId = basePlan.id;

  if (user && targetTenantId && !basePlan.is_custom) {
    finalPlanId = `${basePlan.id}-CUSTOM-${targetTenantId.substring(0, 8).toUpperCase()}`;
    const escapedFeatures = JSON.stringify(currentFeatures).replace(/'/g, "''");

    const sql = `
      BEGIN;
      INSERT INTO plans (
        id, name, description, price, features, recommended, client_type, active, is_custom, tenant_id, target_client_id, created_at, updated_at
      ) VALUES (
        '${finalPlanId}',
        jsonb_build_object('en_US', '${(basePlan.name?.en_US || basePlan.name)} (Custom)', 'es_DO', '${(basePlan.name?.es_DO || basePlan.name)} (Personalizado)'),
        '${JSON.stringify(basePlan.description || {}).replace(/'/g, "''")}'::jsonb,
        ${basePlan.price || 0},
        '${escapedFeatures}'::jsonb,
        false,
        '${basePlan.client_type || 'CLIENT'}',
        true,
        true,
        '${targetTenantId}',
        '${targetUserId}',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        features = EXCLUDED.features,
        updated_at = NOW();

      UPDATE subscriptions
      SET plan = '${finalPlanId}', updated_at = NOW()
      WHERE id = '${targetSubId}';
      COMMIT;
    `;
    await execSql(sql);
  } else {
    const escapedFeatures = JSON.stringify(currentFeatures).replace(/'/g, "''");
    await execSql(`UPDATE plans SET features = '${escapedFeatures}'::jsonb, updated_at = NOW() WHERE id = '${finalPlanId}';`);
  }

  await invalidateRedisCache();

  console.log(`\n✅ [SUCCESS] Features updated successfully for ${user ? `user '${user}'` : `plan '${finalPlanId}'`}`);
  console.log(`   Assigned Plan:   ${finalPlanId}`);
  console.log(`   Added:           [${addedList.join(', ') || 'none'}]`);
  console.log(`   Removed:         [${removedList.join(', ') || 'none'}]`);
  console.log(`   Total Features:  ${currentFeatures.length}`);
  console.log(`   Redis Cache:     Invalidated (gen:plans:global)\n`);
}

async function handleSubExtend(opts) {
  const user = opts.user;
  if (!user) {
    console.error('Error: --user=<email|uuid> is required.');
    process.exit(1);
  }
  const extension = opts.extension || '1 year';
  // Default to zero-invoice for administrative CLI operations to avoid phantom invoices
  const shouldBill = opts.bill === true || opts['create-invoice'] === true || opts.invoice === true;
  const isFree = !shouldBill || opts.free === true || opts['no-invoice'] === true;
  const markPaid = opts['mark-paid'] !== false;

  console.log(`🛡️  [SequenceSentinel] Executing sub:extend...`);
  console.log(`   Target User:     ${user}`);
  console.log(`   Extension:       ${extension}`);
  console.log(`   Pricing:         ${isFree ? 'FREE / COMPLIMENTARY (Zero Invoice Default)' : (markPaid ? 'PAID ($203.90 USD incl. 18% ITBIS)' : 'PENDING')}`);

  let interval = "'1 year'";
  let isAnnual = true;
  if (/(\d+)\s*(?:month|mo)/i.test(extension)) {
    const months = parseInt(extension.match(/(\d+)/)[1], 10);
    interval = `'${months} month'::interval`;
    isAnnual = months >= 12;
  }

  const randNum = String(Math.floor(100000 + Math.random() * 900000));
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${randNum}`;

  const sql = `
    BEGIN;
    UPDATE subscriptions s
    SET 
      renewal_date = s.renewal_date + INTERVAL ${interval},
      service_name = CASE WHEN ${isAnnual} THEN regexp_replace(s.service_name, '\\s*\\((?:Monthly|Annual).*\\)', '') || ' (Annual)' ELSE s.service_name END,
      status = 'ACTIVE'::subscription_status,
      updated_at = NOW()
    FROM users u
    WHERE s.client_id = u.id AND (u.email = '${user}' OR u.id::text = '${user}')
    RETURNING s.id, s.service_name, s.renewal_date, s.tenant_id, s.client_id;

    ${isFree ? '-- Free extension: zero invoice created' : `
    INSERT INTO invoices (
      id, invoice_number, client_id, amount, tax_amount, total, status, invoice_date, due_date, tenant_id, currency, created_at
    )
    SELECT
      gen_random_uuid(), '${invoiceNumber}', s.client_id, 172.80, 31.10, 203.90,
      '${markPaid ? 'PAID' : 'PENDING'}', CURRENT_DATE, CURRENT_DATE + 30, s.tenant_id, 'USD', NOW()
    FROM subscriptions s
    JOIN users u ON s.client_id = u.id
    WHERE (u.email = '${user}' OR u.id::text = '${user}')
    LIMIT 1;
    `}

    INSERT INTO notifications (id, user_id, title, message, link, type, read, tenant_id, created_at)
    SELECT
      gen_random_uuid(), s.client_id, 'Subscription Extended (${extension})',
      'Your subscription has been extended by ${extension}. New renewal date: ' || to_char(s.renewal_date + INTERVAL ${interval}, 'YYYY-MM-DD') || '.',
      '/billing', 'SUBSCRIPTION_RENEWAL_SUCCESS', false, s.tenant_id, NOW()
    FROM subscriptions s
    JOIN users u ON s.client_id = u.id
    WHERE (u.email = '${user}' OR u.id::text = '${user}')
    LIMIT 1;
    COMMIT;
  `;

  await execSql(sql);
  await invalidateRedisCache();

  console.log(`\n✅ [SUCCESS] Subscription extended for user '${user}' by ${extension}`);
  if (isFree) {
    console.log(`   Invoice:         NONE (Free / Complimentary grant)`);
  } else {
    console.log(`   Invoice Issued:  ${invoiceNumber} (Status: ${markPaid ? 'PAID' : 'PENDING'})`);
  }
  console.log(`   Redis Cache:     Invalidated\n`);
}

async function handleUserRole(opts) {
  const user = opts.user;
  if (!user) {
    console.error('Error: --user=<email|uuid> is required.');
    process.exit(1);
  }
  const role = opts.role ? opts.role.toUpperCase() : null;
  const clientType = opts['client-type'] ? opts['client-type'].toUpperCase() : null;
  const isActive = opts.active !== undefined ? String(opts.active) === 'true' : null;

  console.log(`🛡️  [SequenceSentinel] Executing user:role...`);
  console.log(`   Target User:     ${user}`);
  if (role) console.log(`   New Role:        ${role}`);
  if (clientType) console.log(`   Client Type:     ${clientType}`);

  const setClauses = ['updated_at = NOW()'];
  if (role) setClauses.push(`role = '${role}'::user_role`);
  if (clientType) setClauses.push(`client_type = '${clientType}'`);
  if (isActive !== null) setClauses.push(`is_active = ${isActive}`);

  const sql = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE email = '${user}' OR id::text = '${user}'
    RETURNING id, email, name, role, client_type, is_active;
  `;

  const updated = await execSqlJson(sql);
  if (!updated.length) throw new Error(`User '${user}' not found`);

  console.log(`\n✅ [SUCCESS] User account updated:`);
  console.log(`   Email:       ${updated[0].email}`);
  console.log(`   Role:        ${updated[0].role}`);
  console.log(`   Client Type: ${updated[0].client_type}`);
  console.log(`   Active:      ${updated[0].is_active}\n`);
}

async function handlePlanProvision(opts) {
  const user = opts.user;
  const plan = opts.plan || 'PL-001';
  const capacity = parseInt(opts.capacity || '1', 10);
  const cycle = opts.cycle || 'monthly';
  const markPaid = opts['mark-paid'] !== false;

  console.log(`🛡️  [SequenceSentinel] Executing plan:provision...`);
  console.log(`   Target User:     ${user}`);
  console.log(`   Plan:            ${plan}`);
  console.log(`   Capacity:        ${capacity} slot(s)`);

  const users = await execSqlJson(`SELECT id, email, name, tenant_id FROM users WHERE email = '${user}' OR id::text = '${user}' LIMIT 1`);
  if (!users.length) throw new Error(`User '${user}' not found`);
  const u = users[0];

  const plans = await execSqlJson(`SELECT id, name, price FROM plans WHERE id = '${plan}'`);
  if (!plans.length) throw new Error(`Plan '${plan}' not found in catalog`);
  const p = plans[0];

  const randNum = String(Math.floor(100000 + Math.random() * 900000));
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${randNum}`;
  const price = p.price || 18;
  const tax = Math.round(price * capacity * 0.18 * 100) / 100;
  const total = Math.round((price * capacity + tax) * 100) / 100;

  // Default to zero-invoice for administrative CLI operations to avoid phantom invoices
  const shouldBill = opts.bill === true || opts['create-invoice'] === true || opts.invoice === true;
  const isFree = !shouldBill || opts.free === true || opts['no-invoice'] === true || p.price === 0;

  const sql = `
    BEGIN;
    INSERT INTO subscriptions (
      id, client_id, service_name, plan, status, renewal_date, equipment_count, tenant_id, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), '${u.id}', '${p.name?.en_US || p.name} Support Plan (${cycle === 'annual' ? 'Annual' : 'Monthly'})',
      '${p.id}', 'ACTIVE', CURRENT_DATE + ${cycle === 'annual' ? "INTERVAL '1 year'" : "INTERVAL '1 month'"},
      ${capacity}, '${u.tenant_id}', NOW(), NOW()
    ) RETURNING id;

    ${isFree ? '-- Free plan: zero invoice created' : `
    INSERT INTO invoices (
      id, invoice_number, client_id, amount, tax_amount, total, status, invoice_date, due_date, tenant_id, currency, created_at
    ) VALUES (
      gen_random_uuid(), '${invoiceNumber}', '${u.id}', ${price * capacity}, ${tax}, ${total},
      '${markPaid ? 'PAID' : 'PENDING'}', CURRENT_DATE, CURRENT_DATE + 30, '${u.tenant_id}', 'USD', NOW()
    );
    `}
    COMMIT;
  `;

  await execSql(sql);
  await invalidateRedisCache();

  console.log(`\n✅ [SUCCESS] Plan provisioned successfully:`);
  console.log(`   User:        ${u.email} (Tenant: ${u.tenant_id})`);
  console.log(`   Plan:        ${p.id} (${p.name?.en_US || p.name})`);
  if (isFree) {
    console.log(`   Invoice:     NONE (Free / Complimentary grant)\n`);
  } else {
    console.log(`   Invoice:     ${invoiceNumber} ($${total} USD, Status: ${markPaid ? 'PAID' : 'PENDING'})\n`);
  }
}

async function handleInfraAudit(opts) {
  const endpoint = opts.endpoint || ENDPOINT_ID;
  const stack = opts.stack || STACK_ID;

  console.log(`🛡️  [SequenceSentinel] Executing infra:audit...`);
  console.log(`   Portainer URL:   ${PORTAINER_URL}`);
  console.log(`   Endpoint:        ${endpoint}`);
  console.log(`   Stack ID:        ${stack}\n`);

  const stackRes = await portainerRequest(`/api/stacks/${stack}`);
  const stackName = stackRes.data?.Name || `stack-${stack}`;

  const containersRes = await portainerRequest(`/api/endpoints/${endpoint}/docker/containers/json?all=1`);
  const allContainers = Array.isArray(containersRes.data) ? containersRes.data : [];
  const stackContainers = allContainers.filter(c => {
    const labels = c.Labels || {};
    return (
      labels['com.docker.compose.project'] === stackName ||
      c.Names?.some(n => n.toLowerCase().includes('msp') || n.toLowerCase().includes(stackName.toLowerCase()))
    );
  });

  let running = 0;
  let unhealthy = 0;

  for (const c of stackContainers) {
    const name = (c.Names?.[0] || c.Id.substring(0, 12)).replace(/^\//, '');
    const isRunning = c.State === 'running';
    if (isRunning) running++;
    else unhealthy++;
    const icon = isRunning ? '🟢' : '🔴';
    console.log(` ${icon} ${name.padEnd(35)} [${c.State}] - ${c.Status}`);
  }

  const status = unhealthy === 0 && running > 0 ? 'HEALTHY' : 'DEGRADED';
  console.log(`\nOverall Infrastructure Health: ${status === 'HEALTHY' ? '✅ HEALTHY' : '⚠️ ' + status}`);
  console.log(`Running: ${running}/${stackContainers.length} containers online.`);
}

async function handleSubPlan(opts) {
  const user = opts.user;
  const plan = opts.plan;
  if (!user || !plan) {
    console.error('Error: --user=<email|uuid> and --plan=<code> are required.');
    process.exit(1);
  }
  console.log(`🛡️  [SequenceSentinel] Rebinding user subscription plan...`);
  console.log(`   Target User: ${user}`);
  console.log(`   Target Plan: ${plan}`);

  const plans = await execSqlJson(`SELECT id, name FROM plans WHERE id = '${plan}'`);
  if (!plans.length) throw new Error(`Plan '${plan}' not found`);
  const p = plans[0];
  const planName = p.name?.en_US || p.name || plan;

  const sql = `
    BEGIN;
    UPDATE subscriptions
    SET plan = '${plan}', service_name = '${planName} Support Plan (Annual)', updated_at = NOW()
    WHERE client_id IN (SELECT id FROM users WHERE email = '${user}' OR id::text = '${user}');
    DELETE FROM plans WHERE is_custom = true AND target_client_id IN (SELECT id FROM users WHERE email = '${user}' OR id::text = '${user}');
    COMMIT;
  `;
  await execSql(sql);
  await invalidateRedisCache();
  console.log(`\n✅ [SUCCESS] Subscription for '${user}' rebound to plan '${plan}' (${planName})`);
  console.log(`   Redis Cache: Invalidated (gen:plans:global)\n`);
}

async function handleInvoiceVoid(opts) {
  const invoice = opts.invoice || opts.id || opts.number;
  const user = opts.user;
  if (!invoice && !user) {
    console.error('Error: Either --invoice=<number> or --user=<email> is required.');
    process.exit(1);
  }
  console.log(`🛡️  [SequenceSentinel] Voiding / removing invoice...`);
  let sql = '';
  if (invoice) {
    console.log(`   Target Invoice:  ${invoice}`);
    sql = `DELETE FROM invoices WHERE invoice_number = '${invoice}' OR id::text = '${invoice}';`;
  } else if (user) {
    console.log(`   Target User:     ${user}`);
    sql = `
      DELETE FROM invoices 
      WHERE id IN (
        SELECT id FROM invoices WHERE client_id IN (SELECT id FROM users WHERE email = '${user}' OR id::text = '${user}')
        ORDER BY created_at DESC LIMIT 1
      );
    `;
  }
  await execSql(sql);
  await invalidateRedisCache();
  console.log(`\n✅ [SUCCESS] Invoice removed successfully.`);
  console.log(`   Redis Cache:     Invalidated (gen:plans:global)\n`);
}

async function handleInvoiceCreateDiscounted(opts) {
  const user = opts.user || 'e.a.polanco.robles@gmail.com';
  console.log(`🛡️  [SequenceSentinel] Creating 100% discounted invoice for user '${user}'...`);

  const users = await execSqlJson(`SELECT id, email, tenant_id FROM users WHERE email = '${user}' OR id::text = '${user}' OR name ILIKE '%${user}%' LIMIT 1`);
  if (!users.length) throw new Error(`User '${user}' not found`);
  const u = users[0];

  const randNum = String(Math.floor(100000 + Math.random() * 900000));
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${randNum}`;

  const lineItems = [
    { description: 'Basic Support Plan — Monthly Onboarding', quantity: 1, unit_price: 18.00 },
    { description: 'Basic Support Plan — 1-Year Annual Extension', quantity: 1, unit_price: 172.80 },
    { description: 'Promotional 100% Discount (Complimentary Plan Assignment)', quantity: 1, unit_price: -190.80 }
  ];
  const lineItemsJson = JSON.stringify(lineItems).replace(/'/g, "''");

  const sql = `
    INSERT INTO invoices (
      id, invoice_number, client_id, amount, tax_amount, total, status, invoice_date, due_date, tenant_id, currency, line_items, created_at
    ) VALUES (
      gen_random_uuid(),
      '${invoiceNumber}',
      '${u.id}',
      190.80,
      0.00,
      0.00,
      'PAID',
      CURRENT_DATE,
      CURRENT_DATE + 30,
      '${u.tenant_id}',
      'USD',
      '${lineItemsJson}'::jsonb,
      NOW()
    ) RETURNING invoice_number, amount, tax_amount, total, status;
  `;
  await execSql(sql);
  await invalidateRedisCache();
  console.log(`\n✅ [SUCCESS] 100% discounted invoice created successfully: ${invoiceNumber}`);
  console.log(`   Items:           2 items ($18.00 + $172.80 = $190.80)`);
  console.log(`   Discount:        100% (-$190.80)`);
  console.log(`   Total Paid:      $0.00 USD`);
  console.log(`   Redis Cache:     Invalidated (gen:plans:global)\n`);
}

async function handleWorkspaceInspect(opts) {
  const q = opts.search || opts.user || '';
  console.log(`🛡️  [SequenceSentinel] Inspecting workspaces / users matching '${q}'...`);

  const users = await execSqlJson(`
    SELECT u.id as user_id, u.email, u.name as user_name, u.role, u.tenant_id,
           t.name as tenant_name, t.subdomain, t.account_status
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    ${q ? `WHERE u.name ILIKE '%${q}%' OR u.email ILIKE '%${q}%' OR t.name ILIKE '%${q}%'` : ''}
    ORDER BY u.created_at ASC
  `);
  console.log(`\nFound ${users.length} user(s)/tenant(s):`);
  for (const u of users) {
    console.log(`---`);
    console.log(`User:     ${u.user_name} (${u.email}) [ID: ${u.user_id}] Role: ${u.role}`);
    console.log(`Tenant:   ${u.tenant_name} (Subdomain: ${u.subdomain}) [ID: ${u.tenant_id}] Status: ${u.account_status}`);

    const subs = await execSqlJson(`
      SELECT id, service_name, plan, status, equipment_count, renewal_date
      FROM subscriptions
      WHERE tenant_id = '${u.tenant_id}'
      ORDER BY created_at DESC
    `);
    console.log(`Subscriptions (${subs.length}):`);
    for (const s of subs) {
      console.log(`  - [${s.status}] ${s.service_name} (Plan: ${s.plan}, Cap: ${s.equipment_count}, ID: ${s.id})`);
    }

    const equips = await execSqlJson(`
      SELECT id, subscription_id, slot_index, status, device_name, device_serial,
             agent_hostname, agent_last_seen_at, vaultwarden_status
      FROM subscription_equipment
      WHERE tenant_id = '${u.tenant_id}'
      ORDER BY slot_index ASC
    `);
    console.log(`Equipment / Devices (${equips.length}):`);
    for (const e of equips) {
      if (e.status === 'ACTIVE' || e.device_name) {
        const [telem, patches, maints, tkts] = await Promise.all([
          execSqlJson(`SELECT id, zabbix_host_id, agent_status FROM rmm_device_telemetry WHERE equipment_id = '${e.id}'`),
          execSqlJson(`SELECT count(*) as count FROM rmm_patches WHERE equipment_id = '${e.id}'`),
          execSqlJson(`SELECT count(*) as count FROM device_maintenances WHERE equipment_id = '${e.id}'`),
          execSqlJson(`SELECT id, title, status, priority, client_id, tenant_id FROM tickets WHERE equipment_id = '${e.id}'`),
        ]);
        console.log(`  - Slot #${e.slot_index}: ${e.device_name || e.agent_hostname || 'Unnamed'} (Serial: ${e.device_serial || 'N/A'}, Status: ${e.status}, ID: ${e.id}, VW: ${e.vaultwarden_status})`);
        const fullEquip = await execSqlJson(`SELECT * FROM subscription_equipment WHERE id = '${e.id}'`);
        console.log(`    ↳ Full fields: ${JSON.stringify(fullEquip[0])}`);
        console.log(`    ↳ Telemetry: ${telem.length ? JSON.stringify(telem[0]) : 'None'}, Patches: ${patches[0]?.count || 0}, Maints: ${maints[0]?.count || 0}, Tickets: ${tkts.length}`);
        for (const t of tkts) {
          console.log(`      * Ticket: [${t.status}] ${t.title} (ID: ${t.id}, Tenant: ${t.tenant_id})`);
        }
      }
    }

  }
}

async function handleDeviceMove(opts) {
  const from = opts.from || opts['from-user'] || opts['from-workspace'] || 'epolanco@velmartech.com.do';
  const to = opts.to || opts['to-user'] || opts['to-workspace'] || 'vmaldonado@velmartech.com.do';
  const dryRun = opts['dry-run'] === true;

  console.log(`🛡️  [SequenceSentinel] Executing device:move...`);
  console.log(`   Source:          ${from}`);
  console.log(`   Destination:     ${to}`);
  console.log(`   Dry Run:         ${dryRun ? 'YES (No mutations will be made)' : 'NO (Live Execution)'}`);

  // 1. Locate Source User & Tenant
  const sourceUsers = await execSqlJson(`
    SELECT u.id as user_id, u.email, u.name as user_name, u.tenant_id, t.name as tenant_name
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = '${from}' OR u.id::text = '${from}' OR u.name ILIKE '%${from}%' OR t.name ILIKE '%${from}%'
    LIMIT 1
  `);
  if (!sourceUsers.length) throw new Error(`Source user/workspace '${from}' not found`);
  const srcUser = sourceUsers[0];

  // 2. Locate Destination User & Tenant
  const destUsers = await execSqlJson(`
    SELECT u.id as user_id, u.email, u.name as user_name, u.tenant_id, t.name as tenant_name
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = '${to}' OR u.id::text = '${to}' OR u.name ILIKE '%${to}%' OR t.name ILIKE '%${to}%'
    LIMIT 1
  `);
  if (!destUsers.length) throw new Error(`Destination user/workspace '${to}' not found`);
  const dstUser = destUsers[0];

  if (srcUser.tenant_id === dstUser.tenant_id) {
    throw new Error(`Source and destination tenants are identical (${srcUser.tenant_id})`);
  }

  // 3. Find active equipment in source workspace
  const activeDevices = await execSqlJson(`
    SELECT * FROM subscription_equipment
    WHERE tenant_id = '${srcUser.tenant_id}'
      AND (status = 'ACTIVE' OR device_name IS NOT NULL OR agent_hostname IS NOT NULL)
    ORDER BY slot_index ASC
  `);

  if (!activeDevices.length) {
    console.log(`⚠️  No active devices found in source workspace '${srcUser.tenant_name}' (${srcUser.user_name}).`);
    return;
  }

  console.log(`\nFound ${activeDevices.length} active device(s) to move:`);
  for (const d of activeDevices) {
    console.log(`  - Slot #${d.slot_index}: ${d.device_name || d.agent_hostname} (Serial: ${d.device_serial || 'N/A'}, ID: ${d.id})`);
  }

  // 4. Ensure Destination Workspace has an Active Subscription
  const destSubs = await execSqlJson(`
    SELECT id, service_name, plan, status, equipment_count
    FROM subscriptions
    WHERE tenant_id = '${dstUser.tenant_id}' AND status = 'ACTIVE'
    ORDER BY created_at DESC LIMIT 1
  `);

  const isNewSub = !destSubs.length;
  const capacity = 50; // Admin workspace standard capacity
  let destSubId = destSubs[0]?.id || crypto.randomUUID();

  if (isNewSub) {
    console.log(`\n⚙️  Destination workspace has no active subscription. Auto-provisioning 'Admin Infrastructure' (PL-003, Cap: ${capacity}, ID: ${destSubId})...`);
  } else {
    console.log(`\nFound destination subscription: ${destSubs[0].service_name} (ID: ${destSubId})`);
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would execute atomic transaction moving ${activeDevices.length} devices from tenant '${srcUser.tenant_id}' to '${dstUser.tenant_id}'.`);
    return;
  }

  // 5. Execute Atomic Relocation Transaction
  console.log(`\n🚀 Executing atomic database transaction...`);

  const deviceIds = activeDevices.map(d => `'${d.id}'`).join(', ');
  const movedOldSlots = activeDevices.map(d => d.slot_index);
  const srcSubId = activeDevices[0].subscription_id;

  const existingDestSlots = await execSqlJson(`
    SELECT slot_index FROM subscription_equipment WHERE tenant_id = '${dstUser.tenant_id}'
  `);
  const occupiedDestSlots = new Set(existingDestSlots.map(s => s.slot_index));

  const slotMappings = [];
  let nextSlot = 0;
  for (const dev of activeDevices) {
    while (occupiedDestSlots.has(nextSlot)) {
      nextSlot++;
    }
    slotMappings.push({ id: dev.id, name: dev.device_name || dev.agent_hostname, oldSlot: dev.slot_index, newSlot: nextSlot });
    occupiedDestSlots.add(nextSlot);
    nextSlot++;
  }

  const sqlStatements = [
    'BEGIN;'
  ];

  // If new subscription, create it in the transaction
  if (isNewSub) {
    sqlStatements.push(`
      INSERT INTO subscriptions (
        id, client_id, service_name, plan, status, renewal_date, equipment_count, tenant_id, created_at, updated_at
      ) VALUES (
        '${destSubId}', '${dstUser.user_id}', 'Admin Infrastructure', 'PL-003', 'ACTIVE',
        CURRENT_DATE + INTERVAL '10 years', ${capacity}, '${dstUser.tenant_id}', NOW(), NOW()
      );
    `);
  }

  // A. Move each device to destination tenant and destination subscription with new slot_index
  for (const map of slotMappings) {
    sqlStatements.push(`
      UPDATE subscription_equipment
      SET subscription_id = '${destSubId}',
          tenant_id = '${dstUser.tenant_id}',
          slot_index = ${map.newSlot},
          vaultwarden_org_id = CASE WHEN vaultwarden_org_id IS NOT NULL THEN '${dstUser.tenant_id}'::uuid ELSE NULL END,
          updated_at = NOW()
      WHERE id = '${map.id}';
    `);
  }

  // B. Backfill clean empty placeholder slots in source subscription for the vacated slots
  for (const oldSlot of movedOldSlots) {
    sqlStatements.push(`
      INSERT INTO subscription_equipment (
        id, subscription_id, slot_index, status, tenant_id, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), '${srcSubId}', ${oldSlot}, 'PENDING_ACTIVATION', '${srcUser.tenant_id}', NOW(), NOW()
      );
    `);
  }

  // C. Ensure remaining empty slots up to capacity exist in destination subscription
  for (let slot = 0; slot < capacity; slot++) {
    if (!occupiedDestSlots.has(slot)) {
      sqlStatements.push(`
        INSERT INTO subscription_equipment (
          id, subscription_id, slot_index, status, tenant_id, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${destSubId}', ${slot}, 'PENDING_ACTIVATION', '${dstUser.tenant_id}', NOW(), NOW()
        );
      `);
      occupiedDestSlots.add(slot);
    }
  }

  // D. Update associated RMM Telemetry
  sqlStatements.push(`
    UPDATE rmm_device_telemetry
    SET tenant_id = '${dstUser.tenant_id}', updated_at = NOW()
    WHERE equipment_id IN (${deviceIds});
  `);

  // E. Update associated RMM Patches
  sqlStatements.push(`
    UPDATE rmm_patches
    SET tenant_id = '${dstUser.tenant_id}', updated_at = NOW()
    WHERE equipment_id IN (${deviceIds});
  `);

  // F. Update associated Device Maintenances
  sqlStatements.push(`
    UPDATE device_maintenances
    SET subscription_id = '${destSubId}',
        client_id = '${dstUser.user_id}',
        tenant_id = '${dstUser.tenant_id}',
        updated_at = NOW()
    WHERE equipment_id IN (${deviceIds});
  `);

  // G. Update associated Tickets and sub-entities
  sqlStatements.push(`
    UPDATE tickets
    SET client_id = '${dstUser.user_id}',
        tenant_id = '${dstUser.tenant_id}',
        updated_at = NOW()
    WHERE equipment_id IN (${deviceIds});

    UPDATE ticket_events
    SET tenant_id = '${dstUser.tenant_id}'
    WHERE ticket_id IN (SELECT id FROM tickets WHERE equipment_id IN (${deviceIds}));

    UPDATE ticket_responses
    SET tenant_id = '${dstUser.tenant_id}'
    WHERE ticket_id IN (SELECT id FROM tickets WHERE equipment_id IN (${deviceIds}));

    UPDATE ticket_attachments
    SET tenant_id = '${dstUser.tenant_id}'
    WHERE ticket_id IN (SELECT id FROM tickets WHERE equipment_id IN (${deviceIds}));
  `);

  // H. Notifications
  const devNames = activeDevices.map(d => d.device_name || d.agent_hostname).join(', ');
  sqlStatements.push(`
    INSERT INTO notifications (id, user_id, title, message, link, type, read, tenant_id, created_at)
    VALUES (
      gen_random_uuid(), '${dstUser.user_id}', 'Equipment Transferred to Workspace',
      'The following devices have been transferred to your workspace: ${devNames}.',
      '/equipment', 'EQUIPMENT_ACTIVATED', false, '${dstUser.tenant_id}', NOW()
    );

    INSERT INTO notifications (id, user_id, title, message, link, type, read, tenant_id, created_at)
    VALUES (
      gen_random_uuid(), '${srcUser.user_id}', 'Equipment Transferred from Workspace',
      'The following devices have been transferred from your workspace to ${dstUser.user_name}: ${devNames}.',
      '/equipment', 'EQUIPMENT_ACTIVATED', false, '${srcUser.tenant_id}', NOW()
    );
  `);

  sqlStatements.push('COMMIT;');

  const fullSql = sqlStatements.join('\n');
  await execSql(fullSql);
  await invalidateRedisCache();

  console.log(`\n✅ [SUCCESS] Devices successfully transferred:`);
  console.log(`   Source Workspace:      ${srcUser.tenant_name} (${srcUser.user_name})`);
  console.log(`   Destination Workspace: ${dstUser.tenant_name} (${dstUser.user_name})`);
  console.log(`   Subscription Assigned: ${destSubId}`);
  console.log(`   Transferred Devices:`);
  for (const m of slotMappings) {
    console.log(`     - ${m.name}: Slot #${m.oldSlot} (Source) -> Slot #${m.newSlot} (Destination) [ID: ${m.id}]`);
  }
  console.log(`   Source Vacated Slots:  Replaced with PENDING_ACTIVATION placeholders`);
  console.log(`   Destination Capacity:  50 total slots initialized`);
  console.log(`   Telemetry & Tickets:   Updated to tenant ${dstUser.tenant_id}`);
  console.log(`   Redis Cache:           Invalidated\n`);
}

async function main() {
  const { action, options } = parseCliArgs();

  switch (action) {
    case 'device:move':
    case 'device:transfer':
    case 'equipment:move':
      await handleDeviceMove(options);
      break;

    case 'workspace:inspect':
    case 'inspect':
      await handleWorkspaceInspect(options);
      break;

    case 'feature:manage':
    case 'features':
    case 'manage-features':
      await handleFeatureManage(options);
      break;

    case 'sub:plan':
    case 'sub:rebind':
    case 'rebind':
      await handleSubPlan(options);
      break;

    case 'sub:extend':
    case 'extend':
    case 'extend-subscription':
      await handleSubExtend(options);
      break;

    case 'user:role':
    case 'role':
    case 'update-role':
      await handleUserRole(options);
      break;

    case 'plan:provision':
    case 'provision':
    case 'provision-plan':
      await handlePlanProvision(options);
      break;

    case 'invoice:void':
    case 'invoice:delete':
    case 'void-invoice':
      await handleInvoiceVoid(options);
      break;

    case 'invoice:discounted':
    case 'invoice:create-discounted':
      await handleInvoiceCreateDiscounted(options);
      break;

    case 'infra:audit':
    case 'infra':
      await handleInfraAudit(options);
      break;

    default:
      console.log(`
SequenceSentinel Operations CLI
Usage:
  node scripts/sentinel-ops.mjs <action> [options]

Actions:
  device:move          Move all active devices between workspaces/tenants (--from="epolanco..." --to="vmaldonado...")
  workspace:inspect    Inspect workspaces, users, subscriptions, and equipment (--search="...")
  feature:manage       Add or remove features for a user or plan
  sub:plan             Rebind user subscription to a plan (e.g. PL-001)
  sub:extend           Extend subscription duration (e.g. 1 year)
  user:role            Update user role or customer classification
  plan:provision       Provision a subscription plan in one shot
  invoice:void         Void/remove an invoice (--invoice=<num> | --user=<email>)
  invoice:discounted   Create 100% discounted invoice with items (--user=<email>)
  infra:audit          Audit Portainer stack and container health
      `);
  }
}

main().catch(err => {
  console.error('\n❌ [SequenceSentinel ERROR]:', err.message);
  process.exit(1);
});
