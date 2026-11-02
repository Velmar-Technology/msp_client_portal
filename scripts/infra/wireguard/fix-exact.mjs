import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fix() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const target = `server_name pdf.mitefree.net;

            client_max_body_size 50M;

            location / {
                proxy_pass https://10.13.13.3:30443/pdf/;
                proxy_ssl_verify off;
                proxy_http_version 1.1;
                proxy_set_header Host helpdesk.velmartech.com.do;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto https;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
            }`;

  const replacement = `server_name pdf.mitefree.net;

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
            }`;

  if (!content.includes(target)) {
    console.error('Target not found in Stack 18');
    process.exit(1);
  }

  content = content.replace(target, replacement);

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fix();
