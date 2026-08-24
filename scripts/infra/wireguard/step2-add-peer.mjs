import { containers, exec } from './papi.mjs';
import fs from 'fs';

const keys = JSON.parse(fs.readFileSync('nas-keys.json', 'utf8'));

const block = `
[Peer]
# cloud-storage-srv-1 (TrueNAS)
PublicKey = ${keys.nasPublicKey}
PresharedKey = ${keys.presharedKey}
AllowedIPs = 10.13.13.3/32
PersistentKeepalive = 25
`;

const cs = await containers(3);
const wg = cs.find(c => c.Names.includes('/wireguard'));
if (!wg) throw new Error('wireguard container missing');

// Guard: don't add twice
const cur = await exec(3, wg.Id, ['sh', '-c', 'grep -c "cloud-storage-srv-1" /config/wg_confs/wg0.conf || true']);
if ((cur.stdout || '').trim() !== '0') {
  console.log('Peer already present in wg0.conf — skipping append.');
} else {
  const add = await exec(3, wg.Id, ['sh', '-c', `cat >> /config/wg_confs/wg0.conf <<'EOF'${block}\nEOF\necho appended`]);
  console.log('append:', (add.stdout || '').trim(), add.stderr.slice(0, 200));
}

// Apply live without tearing down existing handshakes
const sync = await exec(3, wg.Id, ['bash', '-c', 'wg syncconf wg0 <(wg-quick strip /config/wg_confs/wg0.conf) && echo synced']);
console.log('syncconf:', (sync.stdout || '').trim(), sync.stderr.slice(0, 300));

const show = await exec(3, wg.Id, ['wg', 'show']);
console.log('--- wg show ---');
console.log(show.stdout);
