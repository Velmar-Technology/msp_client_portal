import { containers, exec } from './papi.mjs';

const EP = Number(process.argv[2] || 3);
const name = process.argv[3] || '/wireguard';
const cmd = process.argv.slice(4);
if (cmd.length === 0) { console.error('usage: node run-in.mjs <endpointId> <containerNamePart> <cmd...>'); process.exit(1); }

const cs = await containers(EP);
const c = cs.find(x => x.Names.some(n => n.includes(name)));
if (!c) { console.error('container not found:', name); process.exit(1); }
console.log('>> container:', c.Names[0], c.State);
const r = await exec(EP, c.Id, cmd);
console.log('>> exit', r.exitCode);
if (r.stdout) console.log(r.stdout);
if (r.stderr) console.log('[stderr]', r.stderr.slice(0, 2000));
