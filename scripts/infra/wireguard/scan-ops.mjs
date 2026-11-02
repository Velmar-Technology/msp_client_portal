import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanOps() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  // Check routes with /v1, /v2, /v3 or other sub-paths
  const tests = [
    '/v3/convert/pdf',
    '/v1/render',
    '/v1/pdf/render',
    '/api/render',
    '/render/pdf',
    '/api/v1/render'
  ];
  for (const t of tests) {
    const p = await exec(4, pdf.Id, ['curl', '-sS', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'POST', `http://127.0.0.1:8080${t}`]);
    console.log(`${t.padEnd(20)} POST: ${p.stdout}`);
  }
}

await scanOps();
