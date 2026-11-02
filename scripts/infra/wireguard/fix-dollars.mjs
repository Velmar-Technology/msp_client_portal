import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fixDollars() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  content = content.replace('proxy_set_header X-Real-IP $remote_addr;', 'proxy_set_header X-Real-IP $$remote_addr;');
  content = content.replace('proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;', 'proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;');

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Fixed Stack 18 status:', updateRes.status);
}

await fixDollars();
