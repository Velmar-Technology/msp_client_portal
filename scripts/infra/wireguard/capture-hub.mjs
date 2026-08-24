import { containers, exec } from './papi.mjs';

const cs = await containers(3);
const hub = cs.find(c => c.Names.some(n => n.includes('/wireguard')));

// background capture on physical iface
await exec(3, hub.Id, ['sh', '-c',
  'rm -f /tmp/cap5.txt; nohup sh -c \'timeout 45 tcpdump -ni any host 64.32.126.122 > /tmp/cap5.txt 2>&1\' >/dev/null 2>&1 & echo started'
]);

// wait a moment, then generate tunnel traffic
await new Promise(r => setTimeout(r, 3000));
await exec(3, hub.Id, ['sh', '-c', 'ping -c 4 -W 2 10.13.13.3 >/dev/null 2>&1; wget -q -O /dev/null --timeout=6 http://10.13.13.3:30027/ >/dev/null 2>&1; echo probes-done']);

// let keepalives land in window too (25s cadence)
await new Promise(r => setTimeout(r, 30000));

const res = await exec(3, hub.Id, ['sh', '-c', 'cat /tmp/cap5.txt; echo ===WG===; wg show wg0 | grep -A7 ocpK']);
console.log(res.stdout || ('ERR: ' + res.stderr.slice(0, 200)));
