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

// 2. Sync Cargo.toml files for Rust packages
const cargoTomlPaths = [
  path.join(rootDir, 'packages', 'msp-agent', 'Cargo.toml'),
  path.join(rootDir, 'packages', 'msp-tray', 'src-tauri', 'Cargo.toml'),
];

for (const cargoTomlPath of cargoTomlPaths) {
  if (fs.existsSync(cargoTomlPath)) {
    const content = fs.readFileSync(cargoTomlPath, 'utf8');
    // Match `version = "..."` in the [package] section
    const updated = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${targetVersion}"`);
    if (content !== updated) {
      fs.writeFileSync(cargoTomlPath, updated, 'utf8');
      const relPath = path.relative(rootDir, cargoTomlPath).replace(/\\/g, '/');
      console.log(`[sync-versions] Updated ${relPath} -> ${targetVersion}`);
    }
  }
}

// 3. Sync packages/msp-tray/src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'packages', 'msp-tray', 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  if (tauriConf.version !== targetVersion) {
    tauriConf.version = targetVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
    console.log(`[sync-versions] Updated packages/msp-tray/src-tauri/tauri.conf.json -> ${targetVersion}`);
  }
}

// 4. Sync all workspace package.json files
const packagePaths = [
  path.join(rootDir, 'packages', 'mcp-server', 'package.json'),
  path.join(rootDir, 'packages', 'errors', 'package.json'),
  path.join(rootDir, 'packages', 'msp-tray', 'package.json'),
  path.join(rootDir, 'server', 'package.json'),
  path.join(rootDir, 'client', 'package.json'),
];

for (const pkgPath of packagePaths) {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version !== targetVersion) {
      pkg.version = targetVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      const relPath = path.relative(rootDir, pkgPath).replace(/\\/g, '/');
      console.log(`[sync-versions] Updated ${relPath} -> ${targetVersion}`);
    }
  }
}

console.log('[sync-versions] Version synchronization complete.');
