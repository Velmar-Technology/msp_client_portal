import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fixFinal() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  // Replace any single $host with $$host
  content = content.replaceAll('Host $host', 'Host $$host');

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fixFinal();
