import axios from 'axios';

async function main() {
  console.log('=== MSP Agent Live Docker Roundtrip Test ===\n');

  // 1. Authenticate as Admin
  console.log('1. Authenticating as admin...');
  const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'admin@velmartech.com.do',
    password: 'admin123',
  });
  const token = loginRes.data.data.token;
  console.log('   Authenticated successfully. Token obtained.');

  const headers = { Authorization: `Bearer ${token}` };
  const equipmentId = 'e0000000-0000-0000-0000-000000000001';

  // 2. Check Agent Status
  console.log('\n2. Checking agent status...');
  const statusRes = await axios.get(`http://localhost:3001/api/v1/rmm/agent/${equipmentId}/status`, { headers });
  console.log('   Agent Status Response:', JSON.stringify(statusRes.data, null, 2));

  // 3. Dispatch Live Diagnostics Command to Rust Agent
  console.log('\n3. Dispatching DIAGNOSE_PC to Rust Agent in Docker...');
  const diagRes = await axios.post(`http://localhost:3001/api/v1/rmm/agent/${equipmentId}/diagnostics`, {}, { headers });
  console.log('   Live Diagnostics Payload received from Rust Agent:\n');
  console.log(JSON.stringify(diagRes.data, null, 2));

  // 4. Dispatch PING Command
  console.log('\n4. Dispatching PING to Rust Agent...');
  const pingRes = await axios.post(`http://localhost:3001/api/v1/rmm/agent/${equipmentId}/exec`, {
    command: 'PING',
  }, { headers });
  console.log('   Ping Response from Rust Agent:', JSON.stringify(pingRes.data, null, 2));

  console.log('\n=== LIVE TEST SUCCESSFUL: Full Roundtrip Verified! ===');
}

main().catch((err) => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
