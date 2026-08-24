import { containers, exec } from './papi.mjs';

const EP = 4;
const USER = 'www-data';
const PUBLIC_HOST = 'cloud.velmartech.com.do';
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
if (!r.stdout.includes(HUB_IP)) {
  const idx = r.stdout.trim() ? r.stdout.trim().split('\n').filter(l => l.trim()).length : 0;
  const s = await occ('config:system:set', 'trusted_proxies', String(idx), '--value=' + HUB_IP);
  console.log(`set trusted_proxies ${idx}=${HUB_IP}: exit ${s.exitCode}`, s.stderr.slice(0, 150));
}

let o = await occ('config:system:get', 'overwrite.cli.url');
if (!(o.stdout || '').includes('https://' + PUBLIC_HOST)) {
  const s = await occ('config:system:set', 'overwrite.cli.url', '--value=https://' + PUBLIC_HOST);
  console.log('set overwrite.cli.url: exit', s.exitCode, s.stderr.slice(0, 150));
}

// final state
for (const key of ['trusted_domains', 'trusted_proxies', 'overwrite.cli.url']) {
  const g = await occ('config:system:get', key);
  console.log(`--- ${key} after ---\n${g.stdout}`);
}
