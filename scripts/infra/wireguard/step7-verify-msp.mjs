import { containers, exec, j } from './papi.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// wait for msp_server_prod to come back with new env
let env = null;
for (let i = 0; i < 24; i++) {
  await sleep(10000);
  const cs = await containers(3);
  const srv = cs.find(c => c.Names.some(n => n.includes('msp_server_prod')));
  if (!srv || srv.State !== 'running') { console.log(`waiting... (${i}) state=${srv?.State}`); continue; }
  const d = await j('GET', `/api/endpoints/3/docker/containers/${srv.Id}/json`);
  env = (d.json.Config.Env || []).find(e => e.startsWith('NEXTCLOUD_URL='));
  if (env === 'NEXTCLOUD_URL=10.13.13.3:30027') break;
  console.log('waiting... env=', env);
}
console.log('container env:', env);

// health endpoint
const cs = await containers(3);
const srv = cs.find(c => c.Names.some(n => n.includes('msp_server_prod')));
const h = await exec(3, srv.Id, ['sh', '-c', 'wget -q -O- --timeout=5 http://127.0.0.1:3001/api/v1/health 2>&1 | head -c 200']);
console.log('health:', h.stdout || h.stderr);
