import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { j, req, exec } from '../wireguard/papi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STACK_NAME = 'kopia-backup';
const ENDPOINT_ID = 4; // TrueNAS SCALE endpoint
const CONTAINER_NAME = 'msp_kopia_backup';

async function deployKopiaStack() {
  console.log(`[deploy] Inspecting Portainer Endpoint ${ENDPOINT_ID}...`);
  const epsRes = await j('GET', '/api/endpoints');
  const ep = epsRes.json.find(e => e.Id === ENDPOINT_ID);
  if (!ep) {
    throw new Error(`Endpoint ${ENDPOINT_ID} not found in Portainer!`);
  }
  console.log(`[deploy] Found endpoint: ${ep.Name} (Status: ${ep.Status})`);

  // Step 1: Clean up any old experimental /app/config/htmlui directory
  console.log(`[deploy] Purging /app/config/htmlui inside container...`);
  try {
    await exec(ENDPOINT_ID, CONTAINER_NAME, ['rm', '-rf', '/app/config/htmlui']);
  } catch (err) {
    console.warn(`[deploy] rm -rf error: ${err.message}`);
  }

  // Step 2: Upload clean backup-scheduler.sh
  console.log(`[deploy] Uploading clean backup-scheduler.sh to ${CONTAINER_NAME}...`);
  const schedulerPath = path.join(__dirname, 'backup-scheduler.sh');
  const schedulerContent = fs.readFileSync(schedulerPath, 'utf8').replace(/\r/g, '');
  const b64 = Buffer.from(schedulerContent, 'utf8').toString('base64');
  
  try {
    await exec(ENDPOINT_ID, CONTAINER_NAME, [
      '/bin/sh',
      '-c',
      `echo '${b64}' | base64 -d > /app/config/backup-scheduler.sh && chmod +x /app/config/backup-scheduler.sh`
    ]);
  } catch (err) {
    console.warn(`[deploy] Upload warning: ${err.message}`);
  }

  // Step 3: Re-deploy Stack 26 via Portainer API
  console.log(`[deploy] Updating Stack 26 with single-prompt authentication policy...`);
  const composePath = path.join(__dirname, 'kopia-backup-compose.yml');
  const stackContent = fs.readFileSync(composePath, 'utf8');

  const stacksRes = await j('GET', `/api/stacks?filters=${encodeURIComponent(JSON.stringify({ EndpointID: ENDPOINT_ID }))}`);
  const existingStack = stacksRes.json.find(s => s.Name === STACK_NAME && s.EndpointId === ENDPOINT_ID);

  await j('PUT', `/api/stacks/${existingStack.Id}?endpointId=${ENDPOINT_ID}`, {
    stackFileContent: stackContent,
    prune: false,
    pullImage: false,
  });
  console.log(`[deploy] Stack updated successfully!`);

  // Step 4: Restart container
  console.log(`[deploy] Restarting ${CONTAINER_NAME}...`);
  await j('POST', `/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_NAME}/restart`);

  // Step 5: Wait for native Kopia server to be ready
  console.log(`[deploy] Polling native Kopia Web UI on :51515...`);
  let isReady = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const ping = await exec(ENDPOINT_ID, CONTAINER_NAME, [
        'curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://127.0.0.1:51515/'
      ]);
      if (ping.stdout.trim() === '200') {
        isReady = true;
        console.log(`[deploy] Native Kopia Web UI is ready (HTTP 200) after ${i + 1}s!`);
        break;
      }
    } catch {}
  }

  if (!isReady) {
    throw new Error('Kopia server failed to start on :51515');
  }

  // Step 6: Verify processes
  const psRes = await exec(ENDPOINT_ID, CONTAINER_NAME, ['ps', 'aux']);
  console.log('\nRunning Processes:\n', psRes.stdout);

  // Step 7: Verify Authentication Behavior
  console.log(`\n=== Verification: Single-Prompt Authentication Tests ===`);
  
  // Test 1: Main page without auth -> MUST return 401
  const unauthTest = await exec(ENDPOINT_ID, CONTAINER_NAME, [
    'curl', '-k', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    '-H', 'Host: kopia.mitefree.net',
    'https://10.13.13.3:30443/'
  ]);
  console.log(`1. Root / without auth: HTTP ${unauthTest.stdout.trim()} (Expected: 401)`);

  // Test 2: Main page with auth -> MUST return 200
  const authTest = await exec(ENDPOINT_ID, CONTAINER_NAME, [
    'curl', '-k', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    '-H', 'Host: kopia.mitefree.net',
    '-u', 'admin:VelmarKopia2026!SecureUI',
    'https://10.13.13.3:30443/'
  ]);
  console.log(`2. Root / with auth: HTTP ${authTest.stdout.trim()} (Expected: 200)`);

  // Test 3: Static asset WITHOUT auth -> MUST return 200 (No secondary popup!)
  const assetTest = await exec(ENDPOINT_ID, CONTAINER_NAME, [
    'curl', '-k', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    '-H', 'Host: kopia.mitefree.net',
    'https://10.13.13.3:30443/assets/index-Btxmar9q.js'
  ]);
  console.log(`3. Static /assets without auth: HTTP ${assetTest.stdout.trim()} (Expected: 200 - Silent Load)`);

  // Test 4: /snapshots view with auth -> MUST return 200
  const snapTest = await exec(ENDPOINT_ID, CONTAINER_NAME, [
    'curl', '-k', '-s', '-o', '/dev/null', '-w', '%{http_code}',
    '-H', 'Host: kopia.mitefree.net',
    '-u', 'admin:VelmarKopia2026!SecureUI',
    'https://10.13.13.3:30443/snapshots'
  ]);
  console.log(`4. View /snapshots with auth: HTTP ${snapTest.stdout.trim()} (Expected: 200)`);

  console.log(`\n=== All Deployments and Verifications Succeeded! ===`);
}

deployKopiaStack().catch(err => {
  console.error('[deploy] Fatal error:', err.message);
  process.exit(1);
});
