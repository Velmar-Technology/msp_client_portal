import { j } from './papi.mjs';
import fs from 'fs';

const EP = 3;
const HOST = 'cloud.velmartech.com.do';
const NC_TARGET = 'http://10.13.13.3:30027';

const nginxConf = [
  'map $http_upgrade $connection_upgrade {',
  '    default upgrade;',
  "    ''          close;",
  '}',
  'server {',
  '    listen 80;',
  `    server_name ${HOST};`,
  '',
  '    client_max_body_size 0;',
  '    proxy_request_buffering off;',
  '    proxy_buffering off;',
  '',
  '    location /.well-known/carddav { return 301 $scheme://$host/remote.php/dav; }',
  '    location /.well-known/caldav  { return 301 $scheme://$host/remote.php/dav; }',
  '',
  '    location / {',
  `        proxy_pass ${NC_TARGET};`,
  '        proxy_http_version 1.1;',
  '        proxy_set_header Host $host;',
  '        proxy_set_header X-Real-IP $remote_addr;',
  '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
  '        proxy_set_header X-Forwarded-Proto https;',
  '        proxy_set_header Upgrade $http_upgrade;',
  '        proxy_set_header Connection $connection_upgrade;',
  '        proxy_read_timeout 3600s;',
  '        proxy_send_timeout 3600s;',
  '    }',
  '}',
];

// Compose $$ escaping: literal $ in container must be written as $$
const esc = s => s.replace(/\$/g, '$$$$');

// Build YAML block scalar under "- |" (6 spaces marker, content at 8 spaces)
const blockScalar = nginxConf.map(l => '        ' + esc(l)).join('\n');

const compose = `services:
  cloud-gateway:
    image: nginx:alpine
    container_name: cloud_gateway
    restart: unless-stopped
    networks:
      - reverse-proxy
    command:
      - /bin/sh
      - -c
      - |
        cat > /etc/nginx/conf.d/default.conf <<'NGX'
${blockScalar}
        NGX
        exec nginx -g 'daemon off;'
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=reverse-proxy"
      - "traefik.http.routers.nextcloud-cloud.rule=Host(\`${HOST}\`)"
      - "traefik.http.routers.nextcloud-cloud.entrypoints=websecure"
      - "traefik.http.routers.nextcloud-cloud.tls.certresolver=myresolver"
      - "traefik.http.services.nextcloud-cloud.loadbalancer.server.port=80"
      - "traefik.http.middlewares.nextcloud-sec.headers.stsseconds=31536000"
      - "traefik.http.middlewares.nextcloud-sec.headers.contentTypeNosniff=true"
      - "traefik.http.routers.nextcloud-cloud.middlewares=nextcloud-sec"

networks:
  reverse-proxy:
    external: true
`;

console.log('--- compose to deploy ---');
console.log(compose);
console.log('-------------------------');

fs.writeFileSync('gateway-compose.yml', compose);
const r = await j('POST', `/api/stacks/create/standalone/string?endpointId=${EP}`, {
  name: 'cloud-gateway',
  stackFileContent: compose,
  env: [],
});
console.log('create:', r.status, JSON.stringify(r.json || r.text).slice(0, 400));
