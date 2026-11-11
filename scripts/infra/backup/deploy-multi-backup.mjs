import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { req, j, exec, containers } from '../wireguard/papi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENDPOINT_ID = 4;
const CONTAINER_NAME = 'msp_kopia_backup';

async function uploadScript(containerId, filename) {
  const localPath = path.join(__dirname, filename);
  const content = fs.readFileSync(localPath, 'utf8').replace(/\r/g, '');
  const b64 = Buffer.from(content, 'utf8').toString('base64');
  const targetPath = `/app/config/${filename}`;

  console.log(`[deploy] Uploading ${filename} -> ${targetPath}...`);
  const res = await exec(ENDPOINT_ID, containerId, [
    '/bin/sh',
    '-c',
    `echo '${b64}' | base64 -d > ${targetPath} && chmod +x ${targetPath}`
  ]);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to upload ${filename}: ${res.stderr || res.stdout}`);
  }
  console.log(`[deploy] Uploaded ${filename} successfully.`);
}

async function main() {
  console.log('[deploy] Locating Kopia container on Endpoint 4...');
  const cl = await containers(ENDPOINT_ID);
  const kopia = cl.find(c => c.Names.includes(`/${CONTAINER_NAME}`));
  if (!kopia) throw new Error(`Container ${CONTAINER_NAME} not found on endpoint ${ENDPOINT_ID}`);
  console.log(`[deploy] Found container ${CONTAINER_NAME} (ID: ${kopia.Id.slice(0, 12)})`);

  // Step 1: Upload all 3 scripts
  await uploadScript(kopia.Id, 'backup-databases.sh');
  await uploadScript(kopia.Id, 'backup-state.sh');
  await uploadScript(kopia.Id, 'backup-scheduler.sh');

  // Step 2: Clean up test snapshot if present
  console.log('[deploy] Cleaning up any test snapshots...');
  await exec(ENDPOINT_ID, kopia.Id, [
    '/bin/sh',
    '-c',
    'export PATH="/app/config/bin:$PATH"; kopia snapshot list /sources/test_src | awk \'{print $4}\' | xargs -r -I {} kopia snapshot delete {} --delete'
  ]);

  // Step 3: Run immediate baseline for Core Databases
  console.log('\n======================================================');
  console.log('[baseline] Executing Core Production Databases Backup...');
  console.log('======================================================');
  const dbRun = await exec(ENDPOINT_ID, kopia.Id, ['/bin/sh', '/app/config/backup-databases.sh']);
  console.log(`[baseline] Databases exitCode: ${dbRun.exitCode}`);
  console.log(dbRun.stdout);
  if (dbRun.stderr) console.error(dbRun.stderr);
  if (dbRun.exitCode !== 0) throw new Error('backup-databases.sh failed!');

  // Step 4: Run immediate baseline for State & Bots
  console.log('\n======================================================');
  console.log('[baseline] Executing State & Infrastructure Backup...');
  console.log('======================================================');
  const stateRun = await exec(ENDPOINT_ID, kopia.Id, ['/bin/sh', '/app/config/backup-state.sh']);
  console.log(`[baseline] State exitCode: ${stateRun.exitCode}`);
  console.log(stateRun.stdout);
  if (stateRun.stderr) console.error(stateRun.stderr);
  if (stateRun.exitCode !== 0) throw new Error('backup-state.sh failed!');

  // Step 5: Verify distinct snapshot sources
  console.log('\n======================================================');
  console.log('[verify] Listing all active Kopia snapshot sources...');
  console.log('======================================================');
  const listRun = await exec(ENDPOINT_ID, kopia.Id, [
    '/bin/sh',
    '-c',
    'export PATH="/app/config/bin:$PATH"; kopia snapshot list'
  ]);
  console.log(listRun.stdout);

  // Step 6: Restart container to activate updated scheduler with 3 daily slots
  console.log('\n[deploy] Restarting msp_kopia_backup container to activate multi-slot scheduler...');
  const restartRes = await j('POST', `/api/endpoints/${ENDPOINT_ID}/docker/containers/${kopia.Id}/restart?t=10`);
  console.log('[deploy] Restart response status:', restartRes.status);

  console.log('\n>>> Multi-service Kopia pipeline successfully deployed and verified! <<<');
}

main().catch(err => {
  console.error('[deploy ERROR]', err);
  process.exit(1);
});
