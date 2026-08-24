import { j } from './papi.mjs';

const WG_STACK = 14;
const EP = 3;

const wgCompose = `services:
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: wireguard
    network_mode: host
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Santo_Domingo
      - SERVERURL=172.235.145.77
      - SERVERPORT=51820
      - PEERS=mypcs
      - PEERDNS=auto
      - ALLOWEDIPS=0.0.0.0/0
    devices:
      - /dev/net/tun:/dev/net/tun
    volumes:
      - config:/config
      - modules:/lib/modules
    restart: unless-stopped

volumes:
  config:
  modules:
`;

// Redeploy (v2.39: PUT /stacks/{id} persists file content and redeploys)
let r = await j('PUT', `/api/stacks/${WG_STACK}?endpointId=${EP}`, {
  StackFileContent: wgCompose,
  prune: false,
  pullImage: false,
  env: [],
});
console.log('update POST:', r.status, (r.text || '').slice(0, 300));
