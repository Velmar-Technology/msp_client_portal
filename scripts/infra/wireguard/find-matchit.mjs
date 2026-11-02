import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function findMatchit() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  // Matchit is the router library used by Axum!
  // It registers literal route paths in the binary.
  const res = await exec(4, pdf.Id, ['grep', '-aob', 'matchit', '/app/pdf-service']);
  console.log('Offsets of matchit:', res.stdout);

  const lines = res.stdout.trim().split('\n');
  for (const line of lines.slice(0, 3)) {
    const off = parseInt(line.split(':')[0], 10);
    const dump = await exec(4, pdf.Id, ['dd', 'if=/app/pdf-service', 'bs=1', `skip=${Math.max(0, off - 300)}`, 'count=800']);
    console.log(`--- Dump near ${off} ---`);
    console.log(dump.stdout.replace(/[^\x20-\x7E\n\r]/g, '.'));
  }
}

await findMatchit();
