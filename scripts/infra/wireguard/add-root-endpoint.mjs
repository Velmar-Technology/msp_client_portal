import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function addRoot() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const target = `server_name pdf.mitefree.net;

            client_max_body_size 50M;

            location / {`;

  const replacement = `server_name pdf.mitefree.net;

            client_max_body_size 50M;

            location = / {
                default_type application/json;
                return 200 '{"service":"pdf-service","status":"healthy","version":"0.1.1","endpoints":["/healthz","/api/v1/render","/v3/convert/pdf"]}';
            }

            location / {`;

  if (!content.includes(target)) {
    console.log('Target not found');
    return;
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

await addRoot();
