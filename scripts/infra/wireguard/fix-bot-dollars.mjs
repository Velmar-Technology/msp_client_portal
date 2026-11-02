import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fix() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  // In the bot server blocks, replace $host, $remote_addr, $proxy_add_x_forwarded_for with $$ escapes
  content = content.replace(/server_name bot\.mitefree\.net;[\s\S]*?server_name partdb\.atlas\.velmartech\.com\.do;/, (m) => {
    return m
      .replaceAll('Host $host', 'Host $$host')
      .replaceAll('X-Real-IP $remote_addr', 'X-Real-IP $$remote_addr')
      .replaceAll('X-Forwarded-For $proxy_add_x_forwarded_for', 'X-Forwarded-For $$proxy_add_x_forwarded_for');
  });

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fix();
