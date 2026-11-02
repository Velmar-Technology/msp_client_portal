import { j, containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function testPdf() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  
  const getRoot = await exec(4, pdf.Id, ['curl', '-sS', '-I', 'http://127.0.0.1:8080/']);
  console.log('GET /:\n', getRoot.stdout || getRoot.stderr);

  const getHealth = await exec(4, pdf.Id, ['curl', '-sS', 'http://127.0.0.1:8080/healthz']);
  console.log('GET /healthz:\n', getHealth.stdout || getHealth.stderr);

  const postRender = await exec(4, pdf.Id, ['curl', '-sS', '-X', 'POST', 'http://127.0.0.1:8080/render', '-H', 'Content-Type: application/json', '-d', JSON.stringify({ html: '<h1>Test</h1>' })]);
  console.log('POST /render (first 100 bytes):\n', postRender.stdout.slice(0, 100));
}

await testPdf();
