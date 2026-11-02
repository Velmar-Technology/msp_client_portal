import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function applyBots() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const botBlocks = `        server {
            listen 80;
            server_name bot.mitefree.net;

            client_max_body_size 10M;

            location = / {
                proxy_pass http://10.13.13.3:3001/health;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }

            location / {
                proxy_pass http://10.13.13.3:3001;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }
        server {
            listen 80;
            server_name bot2.mitefree.net;

            client_max_body_size 10M;

            location = / {
                proxy_pass http://10.13.13.3:3002/health;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }

            location / {
                proxy_pass http://10.13.13.3:3002;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }
`;

  const marker = '        server {\n            listen 80;\n            server_name partdb.atlas.velmartech.com.do;';
  if (!content.includes('bot.mitefree.net')) {
    content = content.replace(marker, botBlocks + marker);
  }

  const labelBlocks = `      - "traefik.http.routers.vilma-bot1.rule=Host(\`bot.mitefree.net\`)"
      - "traefik.http.routers.vilma-bot1.entrypoints=websecure"
      - "traefik.http.routers.vilma-bot1.tls.certresolver=myresolver"
      - "traefik.http.routers.vilma-bot1.service=vilma-bot1"
      - "traefik.http.services.vilma-bot1.loadbalancer.server.port=80"
      - "traefik.http.routers.vilma-bot2.rule=Host(\`bot2.mitefree.net\`)"
      - "traefik.http.routers.vilma-bot2.entrypoints=websecure"
      - "traefik.http.routers.vilma-bot2.tls.certresolver=myresolver"
      - "traefik.http.routers.vilma-bot2.service=vilma-bot2"
      - "traefik.http.services.vilma-bot2.loadbalancer.server.port=80"
`;

  const labelMarker = '      - "traefik.http.routers.partdb.rule=';
  if (!content.includes('vilma-bot1')) {
    content = content.replace(labelMarker, labelBlocks + labelMarker);
  }

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Stack 18 update status:', updateRes.status);
}

await applyBots();
