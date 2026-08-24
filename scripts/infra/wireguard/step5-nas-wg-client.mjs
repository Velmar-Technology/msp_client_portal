import { j } from './papi.mjs';
import fs from 'fs';

const EP = 4;
const keys = JSON.parse(fs.readFileSync('nas-keys.json', 'utf8'));
const HUB_PUB = 'BB0xT1mJifO0Yc2MYr1uY+ilZGXntgts1vK7tbJUO1E=';
const PSK = keys.presharedKey;

const compose = `services:
  wireguard-client:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: cloud_wg_client
    network_mode: host
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Santo_Domingo
    volumes:
      - config:/config
    restart: unless-stopped

volumes:
  config:
`;

// create the stack
let r = await j('POST', `/api/stacks/create/standalone/string?endpointId=${EP}`, {
  name: 'cloud-wg',
  stackFileContent: compose,
  env: [],
});
console.log('create cloud-wg:', r.status, JSON.stringify(r.json || r.text).slice(0, 200));
if (r.status !== 200) process.exit(1);
const stackId = r.json.Id;

fs.writeFileSync('cloud-wg-stack-id.txt', String(stackId));

// wait for container
let wgContainer = null;
for (let i = 0; i < 30; i++) {
  await new Promise(res => setTimeout(res, 5000));
  const cs = await j('GET', `/api/endpoints/${EP}/docker/containers/json?all=true`);
  const c = (cs.json || []).find(x => x.Names.some(n => n.includes('cloud_wg_client')));
  if (c && c.State === 'running') { wgContainer = c; break; }
}
if (!wgContainer) throw new Error('cloud_wg_client did not come up');
console.log('container up:', wgContainer.Names[0]);

// write client config into volume and restart so init picks it up
const conf = `[Interface]
Address = 10.13.13.3/32
PrivateKey = ${keys.nasPrivateKey}
ListenPort = 51820

[Peer]
# helpdesk VPS hub
PublicKey = ${HUB_PUB}
PresharedKey = ${PSK}
Endpoint = 172.235.145.77:51820
AllowedIPs = 10.13.13.0/24
PersistentKeepalive = 25
`;

import { exec } from './papi.mjs';
const w = await exec(EP, wgContainer.Id, ['sh', '-c', `mkdir -p /config/wg_confs && cat > /config/wg_confs/wg0.conf <<'EOF'\n${conf}EOF\nchmod 600 /config/wg_confs/wg0.conf && echo written`]);
console.log('conf write:', (w.stdout || '').trim(), w.stderr.slice(0, 200));

const rs = await j('POST', `/api/endpoints/${EP}/docker/containers/${wgContainer.Id}/restart?t=10`);
console.log('restart:', rs.status);
