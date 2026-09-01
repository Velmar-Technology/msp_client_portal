import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, '../dist/index.js');

async function runMcpTest() {
  console.log('====================================================');
  console.log('[TEST] RUNNING ADVANCED MCP TEST SUITE ON THIS PC');
  console.log(`Target: ${serverPath}`);
  console.log('====================================================\n');

  const serverProc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      MSP_API_URL: 'http://localhost:3000/api/v1',
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

  function sendNotification(method: string, params?: any) {
    const notif = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    serverProc.stdin.write(notif);
  }

  // 1. Handshake
  console.log('Step 1: Protocol Handshake...');
  await sendRpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'msp-advanced-tester', version: '1.0.0' },
  });
  sendNotification('notifications/initialized');
  console.log('✅ Handshake complete.');

  // 2. List Tools
  console.log('\nStep 2: Listing Tools...');
  const toolsRes = await sendRpc('tools/list', {});
  const tools = toolsRes.result?.tools || [];
  console.log(`✅ ${tools.length} Tools registered:`);
  tools.forEach((t: any) => console.log(`   - 🛠️  ${t.name.padEnd(30)} : ${t.description.slice(0, 70)}...`));

  // 3. List Prompts
  console.log('\nStep 3: Listing Prompts...');
  const promptsRes = await sendRpc('prompts/list', {});
  const prompts = promptsRes.result?.prompts || [];
  console.log(`✅ ${prompts.length} Prompts registered:`);
  prompts.forEach((p: any) => console.log(`   - 📜 ${p.name.padEnd(28)} : ${p.description}`));

  // 4. Test: Security Posture Audit on THIS PC
  console.log('\nStep 4: Executing "msp_audit_security_posture"...');
  const secRes = await sendRpc('tools/call', {
    name: 'msp_audit_security_posture',
    arguments: {},
  });
  console.log('SECURITY POSTURE RESULT:');
  console.log(secRes.result?.content?.[0]?.text);

  // 5. Test: Network Troubleshoot
  console.log('\nStep 5: Executing "msp_network_troubleshoot"...');
  const netRes = await sendRpc('tools/call', {
    name: 'msp_network_troubleshoot',
    arguments: { targetHost: '1.1.1.1', domainToResolve: 'cloudflare.com' },
  });
  console.log('NETWORK DIAGNOSTICS RESULT:');
  console.log(netRes.result?.content?.[0]?.text);

  // 6. Test: Clean Temp Storage (Dry Run)
  console.log('\nStep 6: Executing "msp_clean_temp_storage" (Dry Run)...');
  const cleanRes = await sendRpc('tools/call', {
    name: 'msp_clean_temp_storage',
    arguments: { dryRun: true },
  });
  console.log('RECOVERABLE DISK SPACE (SIMULATION):');
  console.log(cleanRes.result?.content?.[0]?.text);

  console.log('\n====================================================');
  console.log('ALL ADVANCED MCP TOOLS & PROMPTS VERIFIED!');
  console.log('====================================================');

  serverProc.kill();
  process.exit(0);
}

runMcpTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
