import fs from 'fs';
import https from 'https';

const BASE = process.env.PORTAINER_URL;
const KEY = process.env.PORTAINER_API_KEY;

export function req(method, path, body, { raw = false } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body === undefined || body === null ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const headers = { 'X-API-Key': KEY };
    if (data) {
      headers['Content-Type'] = raw ? 'application/octet-stream' : 'application/json';
      headers['Content-Length'] = data.length;
    }
    const r = https.request(u, { method, headers, rejectUnauthorized: false }, rs => {
      const chunks = [];
      rs.on('data', c => chunks.push(c));
      rs.on('end', () => resolve({ status: rs.statusCode, headers: rs.headers, buf: Buffer.concat(chunks) }));
    });
    r.on('error', reject);
    r.setTimeout(120000, () => r.destroy(new Error('timeout ' + path)));
    if (data) r.write(data);
    r.end();
  });
}

export async function j(method, path, body) {
  const { status, buf } = await req(method, path, body);
  let json = null;
  try { json = JSON.parse(buf.toString('utf8')); } catch {}
  return { status, json, text: buf.toString('utf8') };
}

// Demultiplex docker exec stream frames: [type(1),0,0,0,lenBE(4),payload]
export function demux(buf) {
  let out = Buffer.alloc(0), err = Buffer.alloc(0), off = 0;
  while (off + 8 <= buf.length) {
    const type = buf[off];
    const size = buf.readUInt32BE(off + 4);
    const payload = buf.subarray(off + 8, Math.min(off + 8 + size, buf.length));
    if (type === 1) out = Buffer.concat([out, payload]);
    else if (type === 2) err = Buffer.concat([err, payload]);
    off += 8 + size;
  }
  if (off < buf.length) out = Buffer.concat([out, buf.subarray(off)]); // non-mux fallback
  return { stdout: out.toString('utf8'), stderr: err.toString('utf8') };
}

export async function exec(endpointId, containerId, cmd, { user, workdir } = {}) {
  const body = { AttachStdout: true, AttachStderr: true, Cmd: cmd };
  if (user) body.User = user;
  if (workdir) body.WorkingDir = workdir;
  const cr = await j('POST', `/api/endpoints/${endpointId}/docker/containers/${containerId}/exec`, body);
  if (cr.status !== 200 && cr.status !== 201) throw new Error(`exec create ${cr.status}: ${cr.text}`);
  const execId = cr.json.Id;
  const { status, buf } = await req('POST', `/api/endpoints/${endpointId}/docker/exec/${execId}/start`, { Detach: false, Tty: false });
  const meta = await j('GET', `/api/endpoints/${endpointId}/docker/exec/${execId}/json`);
  const { stdout, stderr } = demux(buf);
  return { status, exitCode: meta.json?.ExitCode, stdout, stderr };
}

export async function containers(endpointId, all = true) {
  const r = await j('GET', `/api/endpoints/${endpointId}/docker/containers/json?all=${all}`);
  if (r.status !== 200) throw new Error(`containers ${r.status}: ${r.text}`);
  return r.json;
}
