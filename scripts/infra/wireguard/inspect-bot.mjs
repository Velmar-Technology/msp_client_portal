import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function inspectBot() {
  const cs = await containers(4);
  const bot1 = cs.find(c => c.Names[0] === '/vilma_whatsapp_bot');
  const findFiles = await exec(4, bot1.Id, ['find', '/app', '-maxdepth', '3']);
  console.log('App files:\n', findFiles.stdout);
}

await inspectBot();
