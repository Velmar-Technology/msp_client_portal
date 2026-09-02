import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { j } from '../wireguard/papi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STACK_NAME = 'kopia-backup';
const ENDPOINT_ID = 4; // TrueNAS SCALE endpoint

async function deployKopiaStack() {
  console.log(`[deploy] Inspecting Portainer Endpoint ${ENDPOINT_ID}...`);
  const epsRes = await j('GET', '/api/endpoints');
  const ep = epsRes.json.find(e => e.Id === ENDPOINT_ID);
  if (!ep) {
    throw new Error(`Endpoint ${ENDPOINT_ID} not found in Portainer!`);
  }
  console.log(`[deploy] Found endpoint: ${ep.Name} (Status: ${ep.Status})`);

  // Read Compose spec
  const composePath = path.join(__dirname, 'kopia-backup-compose.yml');
  const stackContent = fs.readFileSync(composePath, 'utf8');

  // List existing stacks
  const stacksRes = await j('GET', `/api/stacks?filters=${encodeURIComponent(JSON.stringify({ EndpointID: ENDPOINT_ID }))}`);
  const existingStack = stacksRes.json.find(s => s.Name === STACK_NAME && s.EndpointId === ENDPOINT_ID);

  if (existingStack) {
    console.log(`[deploy] Stack '${STACK_NAME}' exists (ID: ${existingStack.Id}). Updating...`);
    const updateRes = await j(
      'PUT',
      `/api/stacks/${existingStack.Id}?endpointId=${ENDPOINT_ID}`,
      {
        stackFileContent: stackContent,
        prune: true,
        pullImage: true,
      }
    );
    if (updateRes.status >= 400) {
      throw new Error(`Failed to update stack: ${updateRes.status} ${updateRes.text}`);
    }
    console.log(`[deploy] Stack updated successfully!`);
  } else {
    console.log(`[deploy] Stack '${STACK_NAME}' does not exist. Creating standalone stack...`);
    const createRes = await j(
      'POST',
      `/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}`,
      {
        name: STACK_NAME,
        stackFileContent: stackContent,
      }
    );
    if (createRes.status >= 400) {
      throw new Error(`Failed to create stack: ${createRes.status} ${createRes.text}`);
    }
    console.log(`[deploy] Stack created successfully! ID: ${createRes.json.Id}`);
  }
}

deployKopiaStack().catch(err => {
  console.error('[deploy] Fatal error:', err.message);
  process.exit(1);
});
