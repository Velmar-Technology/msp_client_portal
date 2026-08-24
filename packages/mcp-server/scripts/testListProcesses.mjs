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
  console.log('📋 Fetching Live Running Processes via Rust MSP Agent');
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

  const startTime = Date.now();
  const result = await apiClient.execAgentCommand(equipmentId, 'LIST_PROCESSES', {
    limit: 15,
    sort_by: 'memory',
  });
  const elapsed = Date.now() - startTime;

  console.log(`⏱️ Query returned in ${elapsed}ms\n`);
  console.log(`📊 Total System Processes: ${result.data.total_processes}`);
  console.log(`🔝 Top ${result.data.returned_count} Processes (Sorted by ${result.data.sort_by.toUpperCase()}):\n`);

  console.table(
    result.data.processes.map((p) => ({
      PID: p.pid,
      'Process Name': p.name,
      'Memory (MB)': p.memory_mb,
      'CPU (%)': p.cpu_usage_pct,
      'Uptime (s)': p.run_time_secs,
    }))
  );
}

main().catch((err) => {
  console.error('Failed to get processes:', err);
  process.exit(1);
});
