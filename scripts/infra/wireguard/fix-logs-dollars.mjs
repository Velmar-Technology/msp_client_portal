import { j } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function fixDollars() {
  const s18 = await j('GET', '/api/stacks/18/file');
  let content = s18.json.StackFileContent;

  const idx1 = content.indexOf('server_name bot.mitefree.net;');
  const idx2 = content.indexOf('server_name partdb.atlas.velmartech.com.do;');

  const before = content.slice(0, idx1);
  let middle = content.slice(idx1, idx2);
  const after = content.slice(idx2);

  // Replace single $ with $$
  middle = middle.replace(/\$(?!\$)/g, '$$$$');

  content = before + middle + after;

  const updateRes = await j('PUT', '/api/stacks/18?endpointId=3', {
    StackFileContent: content,
    prune: false,
    pullImage: false,
    env: []
  });
  console.log('Update status:', updateRes.status);
}

await fixDollars();
