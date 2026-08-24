#!/usr/bin/env node
/**
 * Portainer Stack Updater
 * Deploys target version by updating the production stack via Portainer REST API.
 * Works natively in Node.js on GitHub Actions (Ubuntu) and Windows/macOS.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[portainer] ${msg}`);
}

function error(msg) {
  console.error(`[portainer] ERROR: ${msg}`);
}

async function request(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: process.env.PORTAINER_TLS_INSECURE !== 'true'
    };

    const req = client.request(reqOpts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body, json });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function main() {
  const version = process.argv[2];
  if (!version) {
    error('Usage: portainer-stack-update <VERSION>');
    process.exit(1);
  }

  const portainerUrl = (process.env.PORTAINER_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (process.env.PORTAINER_API_KEY || '').trim();
  const stackTarget = (process.env.PORTAINER_STACK_ID || '').trim();
  let endpointId = (process.env.PORTAINER_ENDPOINT_ID || '').trim();

  if (!portainerUrl || !apiKey || !stackTarget) {
    error('Missing required environment variables (PORTAINER_URL, PORTAINER_API_KEY, PORTAINER_STACK_ID).');
    process.exit(1);
  }

  if (process.env.PORTAINER_TLS_INSECURE === 'true') {
    log('WARNING: TLS certificate verification disabled (PORTAINER_TLS_INSECURE=true)');
  }

  const repoRoot = path.resolve(__dirname, '..');
  const composePath = path.join(repoRoot, 'docker-compose.prod.yml');

  if (!fs.existsSync(composePath)) {
    error(`docker-compose.prod.yml not found at: ${composePath}`);
    process.exit(1);
  }

  const composeContent = fs.readFileSync(composePath, 'utf8');
  const authHeaders = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  };

  log(`Connecting to Portainer at ${portainerUrl}...`);

  let stack = null;
  let stackId = null;

  // 1. If numeric ID, try direct GET first
  if (/^\d+$/.test(stackTarget)) {
    const directRes = await request(`${portainerUrl}/api/stacks/${stackTarget}`, { headers: authHeaders });
    if (directRes.statusCode === 200 && directRes.json?.Id) {
      stack = directRes.json;
      stackId = stack.Id;
      if (!endpointId) endpointId = stack.EndpointId;
    }
  }

  // 2. If not found yet, query /api/stacks catalog
  if (!stack) {
    log(`Resolving stack '${stackTarget}' from Portainer stacks catalog...`);
    const allRes = await request(`${portainerUrl}/api/stacks`, { headers: authHeaders });

    if (allRes.statusCode !== 200 || !Array.isArray(allRes.json)) {
      error(`Failed to list stacks from ${portainerUrl}/api/stacks (HTTP ${allRes.statusCode}): ${allRes.body}`);
      process.exit(1);
    }

    const matched = allRes.json.find(s => String(s.Id) === stackTarget || s.Name === stackTarget);
    if (!matched) {
      error(`Stack '${stackTarget}' not found in Portainer. Available stacks:`);
      allRes.json.forEach(s => console.error(` - ID: ${s.Id} | Name: ${s.Name} | EndpointId: ${s.EndpointId}`));
      process.exit(1);
    }

    stackId = matched.Id;
    if (!endpointId) endpointId = matched.EndpointId;

    // Fetch complete stack details (with Env array)
    const fullRes = await request(`${portainerUrl}/api/stacks/${stackId}`, { headers: authHeaders });
    if (fullRes.statusCode === 200 && fullRes.json?.Id) {
      stack = fullRes.json;
    } else {
      stack = matched;
    }
  }

  log(`Found stack '${stack.Name}' (ID: ${stackId}, Endpoint: ${endpointId})`);

  // Merge VERSION environment variable
  const envMap = new Map();
  if (Array.isArray(stack.Env)) {
    stack.Env.forEach(e => {
      if (e.name !== 'VERSION') envMap.set(e.name, e.value);
    });
  }
  envMap.set('VERSION', version);

  const envArray = Array.from(envMap.entries()).map(([name, value]) => ({ name, value }));

  const payload = {
    stackFileContent: composeContent,
    env: envArray,
    prune: true,
    pullImage: true
  };

  const updateUrl = `${portainerUrl}/api/stacks/${stackId}?endpointId=${endpointId}`;
  log(`Updating stack '${stack.Name}' (ID: ${stackId}) to version ${version}...`);

  const updateRes = await request(updateUrl, { method: 'PUT', headers: authHeaders }, payload);

  if (updateRes.statusCode !== 200) {
    error(`Portainer API returned HTTP ${updateRes.statusCode}: ${updateRes.body}`);
    process.exit(1);
  }

  log(`Stack update accepted — Portainer is pulling images and recreating containers.`);
}

main().catch(err => {
  error(`Fatal exception: ${err.message}`);
  process.exit(1);
});
