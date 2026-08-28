const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Read the target version from root package.json
const rootPkgPath = path.join(rootDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const targetVersion = rootPkg.version;

if (!targetVersion) {
  console.error('[sync-versions] Error: No version found in root package.json');
  process.exit(1);
}

console.log(`[sync-versions] Synchronizing all workspace packages to v${targetVersion}...`);

// 2. Sync packages/msp-agent/Cargo.toml
const cargoTomlPath = path.join(rootDir, 'packages', 'msp-agent', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  const content = fs.readFileSync(cargoTomlPath, 'utf8');
  // Match `version = "..."` in the [package] section
  const updated = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${targetVersion}"`);
  if (content !== updated) {
    fs.writeFileSync(cargoTomlPath, updated, 'utf8');
    console.log(`[sync-versions] Updated packages/msp-agent/Cargo.toml -> ${targetVersion}`);
  }
}

// 3. Sync packages/mcp-server/package.json
const mcpPkgPath = path.join(rootDir, 'packages', 'mcp-server', 'package.json');
if (fs.existsSync(mcpPkgPath)) {
  const mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
  if (mcpPkg.version !== targetVersion) {
    mcpPkg.version = targetVersion;
    fs.writeFileSync(mcpPkgPath, JSON.stringify(mcpPkg, null, 2) + '\n', 'utf8');
    console.log(`[sync-versions] Updated packages/mcp-server/package.json -> ${targetVersion}`);
  }
}

console.log('[sync-versions] Version synchronization complete.');
