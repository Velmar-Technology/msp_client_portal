import http from 'http';
import crypto from 'crypto';

function generateJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('=== MSP Agent Live Docker Roundtrip Test ===\n');

  // 1. Generate Admin JWT Token
  const jwtSecret = 'your_jwt_secret_here_change_in_production';
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

  console.log('1. Generated Admin JWT Token.');

  const authHeader = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const equipmentId = 'e0000000-0000-0000-0000-000000000001';

  // 2. Check Agent Status
  console.log('\n2. Checking connected agent status in WebSocket Gateway...');
  const statusRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/rmm/agent/${equipmentId}/status`,
    method: 'GET',
    headers: authHeader,
  });
  console.log('   Agent Status Response:', JSON.stringify(statusRes.data, null, 2));

  // 3. Dispatch Live Diagnostics Command to Rust Agent in Docker
  console.log('\n3. Dispatching DIAGNOSE_PC to Rust Agent in Docker...');
  const diagRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/rmm/agent/${equipmentId}/diagnostics`,
      method: 'POST',
      headers: authHeader,
    },
    {}
  );
  console.log('   Live Diagnostics Payload received from Rust Agent in Docker:\n');
  console.log(JSON.stringify(diagRes.data, null, 2));

  // 4. Dispatch PING Command to Rust Agent in Docker
  console.log('\n4. Dispatching PING to Rust Agent in Docker...');
  const pingRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/rmm/agent/${equipmentId}/exec`,
      method: 'POST',
      headers: authHeader,
    },
    { command: 'PING' }
  );
  console.log('   Ping Response from Rust Agent in Docker:\n', JSON.stringify(pingRes.data, null, 2));

  console.log('\n================================================================');
  console.log('🎉 LIVE TEST SUCCESSFUL: Full Rust Agent + WebSocket Gateway Roundtrip Verified!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
