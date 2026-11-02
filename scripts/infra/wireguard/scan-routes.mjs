import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanRoutes() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  // Axum / Actix / Tower routing table: routes start with '/'
  const res = await exec(4, pdf.Id, ['grep', '-aoE', '/[a-z0-9_\\-]{2,30}', '/app/pdf-service']);
  const words = res.stdout.split('\n');
  const count = {};
  for (const w of words) {
    if (!w.startsWith('/lib') && !w.startsWith('/usr') && !w.startsWith('/etc') && !w.startsWith('/dev') && !w.startsWith('/proc')) {
      count[w] = (count[w] || 0) + 1;
    }
  }
  console.log('Candidate routes:', Object.keys(count).slice(0, 30));
}

await scanRoutes();
