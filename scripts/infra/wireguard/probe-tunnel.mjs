import { containers, exec } from './papi.mjs';

const cs = await containers(3);
const hub = cs.find(c => c.Names.some(n => n.includes('/wireguard')));

const before = await exec(3, hub.Id, ['sh', '-c', 'wg show wg0 | grep -A7 ocpK | grep transfer']);
console.log('transfer BEFORE:', (before.stdout || '').trim());

const t = await exec(3, hub.Id, ['sh', '-c',
  'echo ===PING===\n' +
  'ping -c 2 -W 2 10.13.13.3 2>&1 | tail -2\n' +
  'echo ===TCP===\n' +
  'wget -q -O /dev/null --timeout=4 http://10.13.13.3:30027/ 2>&1; echo wget-exit:$?\n' +
  'echo ===UDP-CHECK===\n' +
  'which nc || echo no-nc'
]);
console.log(t.stdout || '(no stdout)');
console.log('stderr:', t.stderr.slice(0, 200));

const after = await exec(3, hub.Id, ['sh', '-c', 'wg show wg0 | grep -A7 ocpK | grep transfer']);
console.log('transfer AFTER:', (after.stdout || '').trim());
