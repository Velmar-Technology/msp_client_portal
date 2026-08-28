import { containers, exec } from './papi.mjs';

const EP = 4;
const USER = 'www-data';
const PUBLIC_HOST = 'atlas.velmartech.com.do';
const TUNNEL_IP = '10.13.13.3';
const HUB_IP = '10.13.13.1';

console.log('=== Connecting to Portainer & Fetching Containers on Endpoint', EP, '===');
const cs = await containers(EP);
const nc = cs.find(c => c.Names.some(n => n.includes('ix-nextcloud-nextcloud-1') || n.includes('nextcloud')));
if (!nc) throw new Error('Nextcloud container not found on endpoint ' + EP);
console.log('Found Nextcloud container:', nc.Names[0], `(State: ${nc.State}, Id: ${nc.Id.slice(0, 12)})`);

const occ = (...args) => exec(EP, nc.Id, ['php', 'occ', ...args], { user: USER });

console.log('\n--- 1. Checking Current Configuration ---');
for (const key of ['trusted_domains', 'trusted_proxies', 'overwriteprotocol', 'overwritehost', 'overwrite.cli.url']) {
  try {
    const g = await occ('config:system:get', key);
    console.log(`${key}:\n${g.stdout.trim() || '(empty)'}`);
  } catch (e) {
    console.log(`${key}: (error or not set)`);
  }
}

console.log('\n--- 2. Setting HTTPS Overwrite Parameters ---');
let res = await occ('config:system:set', 'overwriteprotocol', '--value=https');
console.log('Set overwriteprotocol=https:', res.exitCode === 0 ? 'SUCCESS' : 'FAILED', res.stderr);

res = await occ('config:system:set', 'overwritehost', '--value=' + PUBLIC_HOST);
console.log(`Set overwritehost=${PUBLIC_HOST}:`, res.exitCode === 0 ? 'SUCCESS' : 'FAILED', res.stderr);

res = await occ('config:system:set', 'overwrite.cli.url', '--value=https://' + PUBLIC_HOST);
console.log(`Set overwrite.cli.url=https://${PUBLIC_HOST}:`, res.exitCode === 0 ? 'SUCCESS' : 'FAILED', res.stderr);

console.log('\n--- 3. Updating Trusted Domains ---');
let td = await occ('config:system:get', 'trusted_domains');
let tdList = (td.stdout || '').trim().split('\n').map(l => l.trim()).filter(Boolean);
console.log('Current trusted domains:', tdList);

if (!tdList.includes(PUBLIC_HOST)) {
  const nextIdx = tdList.length;
  res = await occ('config:system:set', 'trusted_domains', String(nextIdx), '--value=' + PUBLIC_HOST);
  console.log(`Added ${PUBLIC_HOST} to trusted_domains[${nextIdx}]: exit ${res.exitCode}`);
}

console.log('\n--- 4. Updating Trusted Proxies ---');
let tp = await occ('config:system:get', 'trusted_proxies');
let tpList = (tp.stdout || '').trim().split('\n').map(l => l.trim()).filter(Boolean);
console.log('Current trusted proxies:', tpList);

const requiredProxies = [HUB_IP, TUNNEL_IP, '172.16.0.0/12', '127.0.0.1'];
for (const proxy of requiredProxies) {
  if (!tpList.includes(proxy)) {
    const nextIdx = tpList.length;
    res = await occ('config:system:set', 'trusted_proxies', String(nextIdx), '--value=' + proxy);
    console.log(`Added ${proxy} to trusted_proxies[${nextIdx}]: exit ${res.exitCode}`);
    tpList.push(proxy);
  }
}

console.log('\n--- 5. Final Verified Configuration ---');
for (const key of ['trusted_domains', 'trusted_proxies', 'overwriteprotocol', 'overwritehost', 'overwrite.cli.url']) {
  const g = await occ('config:system:get', key);
  console.log(`\n[${key}]:\n${g.stdout.trim()}`);
}

console.log('\n🎉 Nextcloud HTTPS & Reverse Proxy Configuration Applied Successfully!');
