import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fix() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let lines = s18.json.StackFileContent.split('\n');

  lines = lines.map(line => {
    if (line.includes('proxy_set_header Host $host;')) {
      return line.replace('Host $host;', 'Host $$host;');
    }
    return line;
  });

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: lines.join('\n'),
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fix();
