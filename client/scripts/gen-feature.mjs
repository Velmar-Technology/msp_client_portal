#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootScript = path.resolve(__dirname, '../../scripts/gen-module.mjs');

const args = process.argv.slice(2);
if (!args.includes('--client-only') && !args.includes('--server-only')) {
  args.push('--client-only');
}

const result = spawnSync(process.execPath, [rootScript, ...args], {
  stdio: 'inherit',
});
process.exit(result.status ?? 0);
