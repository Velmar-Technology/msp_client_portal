import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fix() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const target = `            location = / {
                proxy_pass http://10.13.13.3:3001/health;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }`;

  const replacement = `            location = / {
                proxy_pass http://10.13.13.3:3001/health;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }`;

  content = content.replace(target, replacement);

  const target2 = `            location = / {
                proxy_pass http://10.13.13.3:3002/health;
                proxy_http_version 1.1;
                proxy_set_header Host $host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }`;

  const replacement2 = `            location = / {
                proxy_pass http://10.13.13.3:3002/health;
                proxy_http_version 1.1;
                proxy_set_header Host $$host;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
            }`;

  content = content.replace(target2, replacement2);

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fix();
