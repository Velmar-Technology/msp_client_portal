import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function updateStack18() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const nginxBlock = `        server {
            listen 80;
            server_name pdf.mitefree.net;

            client_max_body_size 50M;

            location / {
                proxy_pass https://10.13.13.3:30443;
                proxy_ssl_verify off;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }\n`;

  const marker = '        server {\n            listen 80;\n            server_name partdb.atlas.velmartech.com.do;';
  if (!content.includes('pdf.mitefree.net')) {
    content = content.replace(marker, nginxBlock + marker);
  }

  const labelBlock = `      - "traefik.http.routers.pdf-mitefree.rule=Host(\`pdf.mitefree.net\`)"
      - "traefik.http.routers.pdf-mitefree.entrypoints=websecure"
      - "traefik.http.routers.pdf-mitefree.tls.certresolver=myresolver"
      - "traefik.http.routers.pdf-mitefree.service=pdf-mitefree"
      - "traefik.http.services.pdf-mitefree.loadbalancer.server.port=80"\n`;

  const labelMarker = '      - "traefik.http.routers.partdb.rule=';
  if (!content.includes('pdf-mitefree')) {
    content = content.replace(labelMarker, labelBlock + labelMarker);
  }

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Stack 18 update status:', updateRes.status, (updateRes.text || '').slice(0, 200));
}

async function updateStack44() {
  const s44 = await j('GET', '/api/stacks/44/file');
  let content = s44.json.StackFileContent;

  // Update Traefik routing rule
  content = content.replace(
    'traefik.http.routers.pdf-service.rule=Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/pdf`)',
    'traefik.http.routers.pdf-service.rule=Host(`pdf.mitefree.net`) || (Host(`helpdesk.velmartech.com.do`) && PathPrefix(`/pdf`))'
  );

  const updateRes = await j('PUT', '/api/stacks/44?endpointId=4', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Stack 44 update status:', updateRes.status, (updateRes.text || '').slice(0, 200));
}

await updateStack18();
await updateStack44();
