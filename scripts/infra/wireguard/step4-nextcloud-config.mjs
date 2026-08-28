import { containers, exec } from './papi.mjs';

const EP = 4;
const USER = 'www-data';
const PUBLIC_HOST = 'atlas.velmartech.com.do';
const TUNNEL_IP = '10.13.13.3';
const HUB_IP = '10.13.13.1';

const cs = await containers(EP);
const nc = cs.find(c => c.Names.some(n => n.includes('ix-nextcloud-nextcloud-1')));
if (!nc) throw new Error('nextcloud container not found');
console.log('container:', nc.Names[0], nc.State);

const occ = (...args) => exec(EP, nc.Id, ['php', 'occ', ...args], { user: USER });

// current state
let r = await occ('config:system:get', 'trusted_domains');
console.log('--- trusted_domains before ---\n' + r.stdout);

if (!r.stdout.includes(PUBLIC_HOST)) {
  const idx = r.stdout.trim() ? r.stdout.trim().split('\n').filter(l => l.trim()).length : 0;
  for (const [i, v] of [[idx, PUBLIC_HOST], [idx + 1, TUNNEL_IP]]) {
    const s = await occ('config:system:set', 'trusted_domains', String(i), '--value=' + v);
    console.log(`set trusted_domains ${i}=${v}: exit ${s.exitCode}`, s.stderr.slice(0, 150));
  }
}

r = await occ('config:system:get', 'trusted_proxies');
console.log('--- trusted_proxies before ---\n' + (r.stdout || '(empty)'), r.stderr.slice(0, 100));
const proxies = [HUB_IP, TUNNEL_IP, '172.16.0.0/12', '127.0.0.1'];
for (const p of proxies) {
  if (!r.stdout.includes(p)) {
    const idx = r.stdout.trim() ? r.stdout.trim().split('\n').filter(l => l.trim()).length : 0;
    const s = await occ('config:system:set', 'trusted_proxies', String(idx), '--value=' + p);
    console.log(`set trusted_proxies ${idx}=${p}: exit ${s.exitCode}`, s.stderr.slice(0, 150));
  }
}

await occ('config:system:set', 'overwriteprotocol', '--value=https');
await occ('config:system:set', 'overwritehost', '--value=' + PUBLIC_HOST);
await occ('config:system:set', 'overwrite.cli.url', '--value=https://' + PUBLIC_HOST);

// final state
for (const key of ['trusted_domains', 'trusted_proxies', 'overwriteprotocol', 'overwritehost', 'overwrite.cli.url']) {
  const g = await occ('config:system:get', key);
  console.log(`--- ${key} after ---\n${g.stdout}`);
}
