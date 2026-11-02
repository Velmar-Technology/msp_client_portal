import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanMod() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  const res = await exec(4, pdf.Id, ['grep', '-aob', 'src/api/mod.rs', '/app/pdf-service']);
  console.log('src/api/mod.rs offsets:', res.stdout);

  for (const line of res.stdout.trim().split('\n').slice(0, 3)) {
    const off = parseInt(line.split(':')[0], 10);
    const dump = await exec(4, pdf.Id, ['dd', 'if=/app/pdf-service', 'bs=1', `skip=${Math.max(0, off - 400)}`, 'count=1000']);
    console.log(`--- Dump near ${off} ---`);
    console.log(dump.stdout.replace(/[^\x20-\x7E\n\r]/g, '.'));
  }
}

await scanMod();
