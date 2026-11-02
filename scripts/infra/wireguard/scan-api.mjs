import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanApiFiles() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  const res = await exec(4, pdf.Id, ['grep', '-aoE', 'src/api/[a-zA-Z0-9_/\\.]+', '/app/pdf-service']);
  console.log('src/api files:', [...new Set(res.stdout.split('\n'))]);
}

await scanApiFiles();
