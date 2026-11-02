import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fixStack18() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const badBlockRegex = /server\s*\{\s*listen 80;\s*server_name pdf\.mitefree\.net;[\s\S]*?proxy_send_timeout 3600s;\s*\}\s*\}/;

  const cleanBlock = `server {
            listen 80;
            server_name pdf.mitefree.net;

            client_max_body_size 50M;

            location / {
                proxy_pass https://10.13.13.3:30443/pdf/;
                proxy_ssl_verify off;
                proxy_http_version 1.1;
                proxy_set_header Host helpdesk.velmartech.com.do;
                proxy_set_header X-Real-IP $$remote_addr;
                proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }
        }`;

  content = content.replace(badBlockRegex, cleanBlock);

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Fixed Stack 18 status:', updateRes.status);
}

await fixStack18();
