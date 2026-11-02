import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function scanPdfshiftRoutes() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  // PDFShift compatible API usually mounts at /v3/convert/pdf or /v1/convert/pdf
  const tests = [
    '/v1/convert/pdf',
    '/v2/convert/pdf',
    '/v3/convert/pdf',
    '/v3/convert',
    '/convert/pdf',
    '/pdf/convert',
    '/pdf/merge',
    '/pdf/ops'
  ];
  for (const t of tests) {
    const post = await exec(4, pdf.Id, ['curl', '-sS', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'POST', `http://127.0.0.1:8080${t}`]);
    console.log(`${t.padEnd(20)} POST: ${post.stdout}`);
  }
}

await scanPdfshiftRoutes();
