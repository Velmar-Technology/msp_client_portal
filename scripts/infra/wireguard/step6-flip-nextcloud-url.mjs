import { j } from './papi.mjs';

const STACK = 17, EP = 3;
const OLD = '190.80.130.192:30027';
const NEW = '10.13.13.3:30027';

// fetch current definition + env
const meta = await j('GET', `/api/stacks/${STACK}`);
if (meta.status !== 200) throw new Error('stack fetch failed');
const file = await j('GET', `/api/stacks/${STACK}/file`);
const content = file.json.StackFileContent;

const env = (meta.json.Env || []).map(e =>
  e.name === 'NEXTCLOUD_URL' ? { ...e, value: NEW } : e
);
if (!env.some(e => e.name === 'NEXTCLOUD_URL')) {
  env.push({ name: 'NEXTCLOUD_URL', value: NEW });
}

console.log('env NEXTCLOUD_URL ->', env.find(e => e.name === 'NEXTCLOUD_URL')?.value);

const r = await j('PUT', `/api/stacks/${STACK}?endpointId=${EP}`, {
  StackFileContent: content,
  env,
  prune: false,
  pullImage: false,
});
console.log('redeploy:', r.status, JSON.stringify(r.json || r.text).slice(0, 150));
