import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fixDirect() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  // Let's replace 'Host $host;' with 'Host $$host;' using split/join on exact string
  content = content.split('Host $host;').join('Host $$host;');
  content = content.split('X-Real-IP $remote_addr;').join('X-Real-IP $$remote_addr;');
  content = content.split('X-Forwarded-For $proxy_add_x_forwarded_for;').join('X-Forwarded-For $$proxy_add_x_forwarded_for;');
  content = content.split('Upgrade $http_upgrade;').join('Upgrade $$http_upgrade;');
  content = content.split('Connection $connection_upgrade;').join('Connection $$connection_upgrade;');

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fixDirect();
