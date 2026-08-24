import { j, req } from './papi.mjs';

const EP = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// long-timeout GET with retry
async function getContainers() {
  for (let a = 1; a <= 8; a++) {
    try {
      const { status, buf } = await req('GET', `/api/endpoints/${EP}/docker/containers/json?all=true`, null);
      if (status === 200) return JSON.parse(buf.toString('utf8'));
      console.log('attempt', a, 'status', status);
    } catch (e) {
      console.log('attempt', a, 'err:', e.message.slice(0, 80));
    }
    await sleep(10000);
  }
  throw new Error('containers unreachable');
}

const cs = await getContainers();
const c = cs.find(x => x.Names.some(n => n.includes('cloud_wg_client')));
if (!c) {
  console.log('cloud_wg_client not created yet. All:', cs.map(x => x.Names.join(',')).join(' | '));
} else {
  console.log('found:', c.Names[0], 'state:', c.State, 'image:', c.Image);
}
