import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanOffsets() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  const res = await exec(4, pdf.Id, ['grep', '-aob', 'pdfshift', '/app/pdf-service']);
  console.log('pdfshift offsets:', res.stdout);

  const off = parseInt(res.stdout.split('\n')[0].split(':')[0], 10);
  if (!isNaN(off)) {
    const dump = await exec(4, pdf.Id, ['dd', 'if=/app/pdf-service', 'bs=1', `skip=${Math.max(0, off - 300)}`, 'count=700']);
    console.log(dump.stdout.replace(/[^\x20-\x7E\n\r]/g, '.'));
  }
}

await scanOffsets();
