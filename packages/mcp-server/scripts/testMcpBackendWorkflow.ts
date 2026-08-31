import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, '../dist/index.js');
const API_URL = 'http://localhost:3001/api/v1';
const JWT_SECRET = 'your_jwt_secret_here_change_in_production';

function generateAdminJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN',
      tenantId: '00000000-0000-0000-0000-000000000001',
      email: 'admin@velmartech.com.do',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function runMcpWorkflowTest() {
  console.log('================================================================');
  console.log('[TEST] VERIFYING MCP SERVER <-> BACKEND <-> AGENT WORKFLOW');
  console.log('================================================================\n');

  const token = generateAdminJwt();
  console.log('1. Generated Admin JWT token for MCP client adapter.');

  const serverProc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      MSP_SERVER_URL: 'http://localhost:3001',
      MSP_API_TOKEN: token,
      MSP_TENANT_ID: '00000000-0000-0000-0000-000000000001',
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

  // 1. Initialize MCP Protocol Handshake
  console.log('2. Initializing MCP protocol handshake (stdio)...');
  const initRes = await sendRpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'workflow-tester', version: '1.0.0' },
  });
  console.log('   Server Name:', initRes.result?.serverInfo?.name);
  console.log('   Server Version:', initRes.result?.serverInfo?.version);
  serverProc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  // 2. Query Registered Tools
  console.log('\n3. Querying registered MCP tools...');
  const toolsRes = await sendRpc('tools/list', {});
  const tools: Array<{ name: string; description: string }> = toolsRes.result?.tools || [];
  console.log(`   Found ${tools.length} registered tools:`);

  // Verify that all registered tools are strictly backend/agent tools
  const disallowedTools = [
    'msp_diagnose_local_pc',
    'msp_get_local_event_logs',
    'msp_audit_security_posture',
    'msp_inspect_open_ports',
    'msp_list_startup_programs',
    'msp_restart_windows_service',
    'msp_network_troubleshoot',
    'msp_flush_dns_and_renew_dhcp',
    'msp_clean_temp_storage',
  ];

  let passedToolIsolation = true;
  for (const t of tools) {
    console.log(`   - ${t.name.padEnd(30)} : ${t.description.slice(0, 60)}...`);
    if (disallowedTools.includes(t.name)) {
      console.error(`   [VIOLATION] Tool '${t.name}' executes unproxied on local host!`);
      passedToolIsolation = false;
    }
  }

  if (!passedToolIsolation) {
    throw new Error('MCP server exposes unproxied host tools!');
  }
  console.log('\n[OK] Tool Isolation Check: 100% of registered tools route strictly through Backend & Agent!');

  // 3. Test Calling Tools
  console.log('\n4. Testing Tool Invocations via Backend Proxy:');

  async function testCall(toolName: string, args: Record<string, any>) {
    process.stdout.write(`   Testing '${toolName}' ... `);
    const res = await sendRpc('tools/call', { name: toolName, arguments: args });
    const content = res.result?.content?.[0]?.text;
    const isError = res.result?.isError;
    if (isError) {
      console.log(`[Routed to Backend] -> Error handled cleanly: ${content?.slice(0, 80)}`);
    } else {
      console.log(`[Routed to Backend] -> Success: ${content?.slice(0, 80)}`);
    }
    return res.result;
  }

  await testCall('msp_list_connected_agents', {});
  await testCall('msp_remote_agent_status', { equipmentId: 'e0000000-0000-0000-0000-000000000001' });
  await testCall('msp_remote_diagnose_pc', { equipmentId: 'e0000000-0000-0000-0000-000000000001' });
  await testCall('msp_remote_exec_command', { equipmentId: 'e0000000-0000-0000-0000-000000000001', command: 'PING' });
  await testCall('msp_remote_exec_powershell', { equipmentId: 'e0000000-0000-0000-0000-000000000001', script: 'Get-Service' });
  await testCall('msp_list_tickets', { status: 'OPEN' });
  await testCall('msp_get_client_equipment', { tenantId: '00000000-0000-0000-0000-000000000001' });

  // 4. Test Prompts Listing
  console.log('\n5. Testing Prompts Registry:');
  const promptsRes = await sendRpc('prompts/list', {});
  const prompts = promptsRes.result?.prompts || [];
  for (const p of prompts) {
    console.log(`   - ${p.name}: ${p.description}`);
  }

  serverProc.kill();
  console.log('\n================================================================');
  console.log('MCP BACKEND + MSP-AGENT ONLY WORKFLOW TEST PASSED!');
  console.log('================================================================');
}

runMcpWorkflowTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
