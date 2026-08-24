import { containers, exec } from './papi.mjs';

const cs = await containers(3);
const hub = cs.find(c => c.Names.some(n => n.includes('/wireguard')));

const info = await exec(3, hub.Id, ['sh', '-c',
  'ip -4 route show default; echo ===IFACES===; ip -brief addr | grep -v wg0; echo ===TCPDUMP===; which tcpdump || echo NO-TCPDUMP'
]);
console.log(info.stdout || ('ERR: ' + info.stderr.slice(0, 200)));

// capture on any iface, filtered to NAS public endpoint
const cap = await exec(3, hub.Id, ['sh', '-c',
  'timeout 25 tcpdump -c 20 -ni any host 64.32.126.122 2>&1 | head -22'
]);
console.log('=== CAPTURE 64.32.126.122 ===');
console.log(cap.stdout || '(nothing captured)');
console.log(cap.stderr ? 'stderr: ' + cap.stderr.slice(0, 150) : '');
