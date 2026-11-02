import { containers, exec } from './papi.mjs';

process.env.PORTAINER_URL = 'https://helpdesk.velmartech.com.do:9443';
process.env.PORTAINER_API_KEY = 'ptr_W8K+C6lIaqSa5LrLavyEvoMpyJ8DiqKDQpmhE+xdU+k=';

async function testCandidateEndpoints() {
  const cs = await containers(4);
  const pdf = cs.find(c => c.Names[0] === '/pdf-service');
  
  // Try several methods and endpoints
  const endpoints = ['/healthz', '/health', '/api', '/api/v1', '/api/v1/pdf', '/pdf', '/generate', '/render', '/convert', '/html'];
  for (const ep of endpoints) {
    const g = await exec(4, pdf.Id, ['curl', '-sS', '-o', '/dev/null', '-w', '%{http_code}', `http://127.0.0.1:8080${ep}`]);
    const p = await exec(4, pdf.Id, ['curl', '-sS', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'POST', `http://127.0.0.1:8080${ep}`]);
    console.log(`${ep.padEnd(15)} GET: ${g.stdout} | POST: ${p.stdout}`);
  }
}

await testCandidateEndpoints();
