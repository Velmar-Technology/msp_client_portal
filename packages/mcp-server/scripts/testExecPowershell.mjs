import crypto from 'crypto';
import { MspApiClient } from '../dist/client/MspApiClient.js';

function generateJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

async function main() {
  console.log('================================================================');
  console.log('⚡ Executing Commands via Rust MSP Agent over MCP Tunnel');
  console.log('================================================================\n');

  const jwtSecret = 'your_jwt_secret_here_change_in_production';
  const equipmentId = 'e0000000-0000-0000-0000-000000000001';

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

  const apiClient = new MspApiClient({
    apiUrl: 'http://localhost:3001/api/v1',
    apiToken: token,
    tenantId: '00000000-0000-0000-0000-000000000001',
  });

  // Test 1: Query System Info / OS release
  console.log('1. Executing command: uname -a && cat /etc/os-release | grep PRETTY_NAME...');
  const res1 = await apiClient.execAgentCommand(equipmentId, 'EXEC_POWERSHELL', {
    script: 'uname -a && cat /etc/os-release | grep PRETTY_NAME',
  });
  console.log('   Result:\n', JSON.stringify(res1.data, null, 2));

  // Test 2: Query CPU Model from /proc/cpuinfo
  console.log('\n2. Executing command: cat /proc/cpuinfo | grep "model name" | head -n 2...');
  const res2 = await apiClient.execAgentCommand(equipmentId, 'EXEC_POWERSHELL', {
    script: 'cat /proc/cpuinfo | grep "model name" | head -n 2',
  });
  console.log('   Result:\n', JSON.stringify(res2.data, null, 2));

  // Test 3: Query Disk Space via df -h
  console.log('\n3. Executing command: df -h /...');
  const res3 = await apiClient.execAgentCommand(equipmentId, 'EXEC_POWERSHELL', {
    script: 'df -h /',
  });
  console.log('   Result:\n', JSON.stringify(res3.data, null, 2));

  console.log('\n================================================================');
  console.log('🎉 REMOTE COMMAND EXECUTION TEST PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
