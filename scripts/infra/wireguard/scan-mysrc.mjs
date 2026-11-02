import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanMySrc() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  const res = await exec(4, pdf.Id, ['grep', '-aoE', 'src/[a-zA-Z0-9_/\\.]+', '/app/pdf-service']);
  const files = [...new Set(res.stdout.split('\n'))].filter(f => !f.includes('index.crates.io') && !f.includes('rustc'));
  console.log('App source files:');
  console.log(files);
}

await scanMySrc();
