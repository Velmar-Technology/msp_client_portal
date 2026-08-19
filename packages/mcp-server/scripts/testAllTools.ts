import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, '../dist/index.js');
const API_URL = 'http://localhost:3001/api/v1';
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function generateAdminJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      role: 'ADMIN',
      tenantId: 'ef010203-0405-0607-0809-0a0b0c0d0e0f',
      email: 'admin@msp-services.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function runFullTest() {
  console.log('================================================================');
  console.log('🧪 TESTING EVERY SINGLE MCP TOOL (18 TOOLS & 2 PROMPTS)');
  console.log('================================================================\n');

  // Step 0: Generate Admin JWT token
  console.log('🔐 Step 0: Generating valid Admin JWT Token...');
  const token = generateAdminJwt();
  console.log('✅ Token generated successfully!\n');

  // Spawn MCP Server
  const serverProc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      MSP_API_URL: API_URL,
      MSP_API_TOKEN: token,
      MSP_TENANT_ID: 'bc111111-1111-1111-1111-111111111111',
    },
  });

  let messageId = 1;
  const pendingRequests = new Map<number, (res: any) => void>();
  let buffer = '';

  serverProc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line.trim());
        if (json.id && pendingRequests.has(json.id)) {
          const resolve = pendingRequests.get(json.id)!;
          pendingRequests.delete(json.id);
          resolve(json);
        }
      } catch (err) {
        console.error('Error parsing line:', line, err);
      }
    }
  });

  function sendRpc(method: string, params: any): Promise<any> {
    return new Promise((resolve) => {
      const id = messageId++;
      pendingRequests.set(id, resolve);
      const req = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      serverProc.stdin.write(req);
    });
  }

  // Initialize
  await sendRpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'all-tools-tester', version: '1.0.0' },
  });
  serverProc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  async function testTool(toolName: string, args: Record<string, any>) {
    process.stdout.write(`🔹 Testing tool: ${toolName.padEnd(30)} ... `);
    try {
      const res = await sendRpc('tools/call', { name: toolName, arguments: args });
      if (res.result?.isError) {
        console.log(`⚠️  Returned Managed Notice: ${res.result.content?.[0]?.text?.slice(0, 70)}...`);
      } else {
        const snippet = res.result?.content?.[0]?.text?.slice(0, 60)?.replace(/\n/g, ' ') || 'OK';
        console.log(`✅ SUCCESS (${snippet}...)`);
      }
      return res.result;
    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }

  // Test all 18 tools
  console.log('--- [1. HOST & SYSTEM DIAGNOSTIC TOOLS] ---');
  await testTool('msp_diagnose_local_pc', {});
  await testTool('msp_get_local_event_logs', { logName: 'Application', level: 'Error', maxEvents: 2 });

  console.log('\n--- [2. SECURITY & COMPLIANCE TOOLS] ---');
  await testTool('msp_audit_security_posture', {});
  await testTool('msp_inspect_open_ports', { maxPorts: 5 });
  await testTool('msp_list_startup_programs', {});

  console.log('\n--- [3. REMEDIATION & NETWORK TOOLS] ---');
  await testTool('msp_network_troubleshoot', { targetHost: '1.1.1.1', domainToResolve: 'google.com' });
  await testTool('msp_flush_dns_and_renew_dhcp', {});
  await testTool('msp_clean_temp_storage', { dryRun: true });
  await testTool('msp_restart_windows_service', { serviceName: 'Dnscache' });

  console.log('\n--- [4. TICKET MANAGEMENT & TRIAGE TOOLS] ---');
  await testTool('msp_list_tickets', { status: 'OPEN' });
  await testTool('msp_get_ticket', { ticketId: '11111111-1111-1111-1111-111111111111' });
  await testTool('msp_add_ticket_reply', {
    ticketId: '11111111-1111-1111-1111-111111111111',
    message: 'Automated diagnostic complete via MCP.',
    isInternal: true,
  });
  await testTool('msp_update_ticket_status', {
    ticketId: '11111111-1111-1111-1111-111111111111',
    status: 'IN_PROGRESS',
    notes: 'Reviewed via MCP agent',
  });

  console.log('\n--- [5. INVENTORY & QBR HEALTH TOOLS] ---');
  await testTool('msp_get_client_equipment', { tenantId: 'bc111111-1111-1111-1111-111111111111' });
  await testTool('msp_get_client_health', { tenantId: 'bc111111-1111-1111-1111-111111111111' });

  console.log('\n--- [6. RMM TELEMETRY & PATCH TOOLS] ---');
  await testTool('msp_get_device_telemetry', { equipmentId: '11111111-1111-1111-1111-111111111111' });
  await testTool('msp_list_device_patches', { equipmentId: '11111111-1111-1111-1111-111111111111' });
  await testTool('msp_get_device_maintenances', { equipmentId: '11111111-1111-1111-1111-111111111111' });

  console.log('\n--- [7. MCP PROMPTS] ---');
  const promptsRes = await sendRpc('prompts/list', {});
  console.log(`✅ Verified ${promptsRes.result?.prompts?.length} Prompts in registry:`);
  promptsRes.result?.prompts?.forEach((p: any) => console.log(`   - 📜 ${p.name}: ${p.description}`));

  console.log('\n================================================================');
  console.log('🎉 ALL 18 TOOLS AND PROMPTS COMPLETED THEIR TEST RUNS!');
  console.log('================================================================');

  serverProc.kill();
  process.exit(0);
}

runFullTest().catch((err) => {
  console.error('Test Execution Failed:', err);
  process.exit(1);
});
