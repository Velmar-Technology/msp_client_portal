import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scan() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  const res = await exec(4, pdf.Id, ['grep', '-aob', 'healthz', '/app/pdf-service']);
  console.log('Offsets of healthz:', res.stdout);

  // Read 500 bytes before and after first offset
  const offset = parseInt(res.stdout.split(':')[0], 10);
  if (!isNaN(offset)) {
    const dump = await exec(4, pdf.Id, ['dd', 'if=/app/pdf-service', 'bs=1', `skip=${Math.max(0, offset - 200)}`, 'count=500']);
    console.log('Surrounding text:');
    console.log(dump.stdout.replace(/[^\x20-\x7E\n\r]/g, '.'));
  }
}

await scan();
