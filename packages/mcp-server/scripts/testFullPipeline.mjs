import crypto from 'crypto';
import { MspApiClient } from '../dist/client/MspApiClient.js';

function generateJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

async function runTest() {
  console.log('===============================================================');
  console.log('🤖 MSP Model Context Protocol (MCP) + Rust Agent Live Test');
  console.log('===============================================================\n');

  const jwtSecret = 'your_jwt_secret_here_change_in_production';
  const equipmentId = 'e0000000-0000-0000-0000-000000000001';

  // 1. Generate token
  const token = generateJwt(
    {
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'admin@velmartech.com.do',
      role: 'ADMIN',
      tenantId: '00000000-0000-0000-0000-000000000001',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    jwtSecret
  );

  // 2. Initialize MCP Api Client Adapter
  console.log('1. Initializing MspApiClient adapter...');
  const apiClient = new MspApiClient({
    apiUrl: 'http://localhost:3001/api/v1',
    apiToken: token,
    tenantId: '00000000-0000-0000-0000-000000000001',
  });
  console.log('   MspApiClient ready.\n');

  // 3. Test Tool: msp_remote_agent_status
  console.log('2. [Tool: msp_remote_agent_status] Checking agent online status...');
  const status = await apiClient.getAgentStatus(equipmentId);
  console.log('   Result:', JSON.stringify(status, null, 2));

  // 4. Test Tool: List connected agents
  console.log('\n3. [Tool: getConnectedAgents] Listing all active agents in Gateway...');
  const allAgents = await apiClient.getConnectedAgents();
  console.log('   Result:', JSON.stringify(allAgents, null, 2));

  // 5. Test Tool: msp_remote_diagnose_pc (Live Rust sysinfo extraction)
  console.log('\n4. [Tool: msp_remote_diagnose_pc] Dispatching DIAGNOSE_PC to Rust Agent...');
  const startTime = Date.now();
  const diagnostics = await apiClient.getRemoteDiagnostics(equipmentId);
  const duration = Date.now() - startTime;
  console.log(`   Result (completed in ${duration}ms):`);
  console.log(JSON.stringify(diagnostics, null, 2));

  // 6. Test Tool: msp_remote_exec_command (PING)
  console.log('\n5. [Tool: msp_remote_exec_command] Sending PING command...');
  const ping = await apiClient.execAgentCommand(equipmentId, 'PING');
  console.log('   Result:', JSON.stringify(ping, null, 2));

  console.log('\n===============================================================');
  console.log('✅ ALL MCP TOOLS & RUST AGENT TUNNEL TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
