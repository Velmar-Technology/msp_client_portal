const fs = require('fs');
const path = require('path');

const BASE_SYSTEM_PERMISSION_CODES = [
  'users:read',
  'users:manage',
  'roles:manage',
  'crm:leads:read',
  'crm:leads:write',
  'crm:quotes:write',
  'invoices:read',
  'invoices:write',
  'invoices:mark_paid',
  'devices:read',
  'devices:manage',
  'plans:read',
  'plans:manage',
  'system:read',
  'system:audit',
];

const IGNORED_DIRS = new Set([
  'controllers',
  'services',
  'repositories',
  'routes',
  'middleware',
  'utils',
  'types',
  '__tests__',
  'node_modules',
]);

/**
 * Parses a module's colocated `security.csv` file (`code,module,description,roles`)
 * into structured SecurityRuleDefinition entries and a normalized ServerModulePermissions block.
 *
 * @param csvPath - Absolute path to `security.csv`
 * @returns Object with parsed `rules` array and `permissionsBlock` string
 */
function parseSecurityCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return { rules: [], permissionsBlock: null };
  }

  // Skip header row if it starts with `code,`
  const dataLines = /^code\s*,/i.test(lines[0]) ? lines.slice(1) : lines;
  const rules = [];
  const catalog = [];
  const admin = [];
  const technician = [];
  const client = [];

  for (const line of dataLines) {
    const parts = line.split(',').map((p) => p.trim());
    const [code, modName, description = '', rolesStr = ''] = parts;
    if (!code || !modName) continue;

    const roles = rolesStr
      .split('|')
      .map((r) => r.trim())
      .filter(Boolean);

    rules.push({ code, module: modName, description, roles });
    catalog.push(code);

    const upperRoles = new Set(roles.map((r) => r.toUpperCase()));
    if (upperRoles.has('ADMIN')) admin.push(code);
    if (upperRoles.has('TECHNICIAN')) technician.push(code);
    if (upperRoles.has('CLIENT')) client.push(code);
  }

  if (rules.length === 0) {
    return { rules: [], permissionsBlock: null };
  }

  const fmtArr = (arr) => `[${arr.map((c) => `'${c}'`).join(', ')}]`;
  const permissionsBlock = [
    '{',
    `    catalog: ${fmtArr(catalog)},`,
    `    admin: ${fmtArr(admin)},`,
    `    technician: ${fmtArr(technician)},`,
    `    client: ${fmtArr(client)},`,
    '  }',
  ].join('\n');

  return { rules, permissionsBlock };
}

/**
 * Fallback extractor for legacy `manifest.ts` files that inline `permissions`
 * instead of using a colocated `security.csv`.
 *
 * @param filePath - Absolute path to `manifest.ts`
 * @returns Normalized ServerModulePermissions object literal string or null
 */
function extractLegacyPermissionsBlock(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const arrayPermMatch = src.match(/permissions\s*:\s*(\[[\s\S]*?\])/);
  const grantsMatch = src.match(/defaultRoleGrants\s*:\s*(\{[\s\S]*?\n\s*\})/);

  if (arrayPermMatch) {
    const catalogStr = arrayPermMatch[1].trim();
    if (grantsMatch) {
      const innerGrants = grantsMatch[1]
        .trim()
        .replace(/^\{/, '')
        .replace(/\}$/, '')
        .trim();
      return `{\n    catalog: ${catalogStr},\n    ${innerGrants}\n  }`;
    }
    return `{\n    catalog: ${catalogStr},\n  }`;
  }

  const legacyObjMatch = src.match(/permissions\s*:\s*(\{[\s\S]*?\n\s*\})/);
  return legacyObjMatch ? legacyObjMatch[1] : null;
}

/**
 * Recursively scans `server/src/modules/` for `<domain>.schema.ts`, `manifest.ts`,
 * and `security.csv` at any hierarchy depth.
 *
 * @param dir - Directory to scan
 * @param relModulePath - Relative path inside `src/modules/`
 * @param acc - Accumulator for discovered schemas, manifests, and security.csv rules
 */
function scanModulesRecursive(dir, relModulePath, acc) {
  if (!fs.existsSync(dir)) return;
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasSecurityCsv = entries.some((e) => e.isFile() && e.name === 'security.csv');

  for (const entry of entries) {
    if (entry.isFile()) {
      if (
        entry.name.endsWith('.schema.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        relModulePath
      ) {
        const baseName = entry.name.replace(/\.ts$/, '');
        acc.schemaExports.push(`export * from '@modules/${relModulePath}/${baseName}';`);
      } else if (entry.name === 'security.csv' && relModulePath) {
        const { rules, permissionsBlock } = parseSecurityCsv(path.join(dir, entry.name));
        for (const r of rules) {
          const rolesLit = `[${r.roles.map((role) => `'${role.replace(/'/g, "\\'")}'`).join(', ')}]`;
          acc.securityRulesList.push(
            `  { code: '${r.code}', module: '${r.module}', description: '${r.description.replace(/'/g, "\\'")}', roles: ${rolesLit} },`
          );
          if (acc.discoveredCodes) {
            acc.discoveredCodes.add(r.code);
          }
        }
        if (permissionsBlock) {
          acc.permissionsList.push(`  ${permissionsBlock},`);
        }
      } else if (entry.name === 'manifest.ts' && relModulePath) {
        const safeVarName = `${relModulePath.replace(/[^a-zA-Z0-9_$]/g, '_')}Manifest`;
        acc.manifestImports.push(
          `import { moduleManifest as ${safeVarName} } from '@modules/${relModulePath}/manifest';`
        );
        acc.manifestList.push(`  ${safeVarName},`);
        if (!hasSecurityCsv) {
          const permsBlock = extractLegacyPermissionsBlock(path.join(dir, entry.name));
          if (permsBlock) {
            acc.permissionsList.push(`  ${permsBlock},`);
          }
        }
      }
    } else if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
      const nextRelPath = relModulePath ? `${relModulePath}/${entry.name}` : entry.name;
      scanModulesRecursive(path.join(dir, entry.name), nextRelPath, acc);
    }
  }
}

/**
 * Automatically scans `server/src/modules/` for colocated `*.schema.ts`, `manifest.ts`,
 * and `security.csv` files across flat and nested module hierarchies, generating:
 * - `server/src/shared/db/schemas.generated.ts`
 * - `server/src/shared/registry/modules.generated.ts`
 * - `server/src/shared/registry/permissions.generated.ts`
 */
function syncServerRegistry() {
  const srcDir = path.join(__dirname, '../src');
  const modulesDir = path.join(srcDir, 'modules');
  const schemasOutFile = path.join(srcDir, 'shared/db/schemas.generated.ts');
  const modulesOutFile = path.join(srcDir, 'shared/registry/modules.generated.ts');
  const permsOutFile = path.join(srcDir, 'shared/registry/permissions.generated.ts');
  const contractsPermsOutFile = path.resolve(
    __dirname,
    '../../packages/contracts/src/auth/permissions.generated.ts'
  );

  const acc = {
    schemaExports: [],
    manifestImports: [],
    manifestList: [],
    permissionsList: [],
    securityRulesList: [],
    discoveredCodes: new Set(),
  };

  scanModulesRecursive(modulesDir, '', acc);

  const sortedDiscoveredCodes = Array.from(acc.discoveredCodes).sort();
  const combinedAllCodes = Array.from(
    new Set([...BASE_SYSTEM_PERMISSION_CODES, ...sortedDiscoveredCodes])
  ).sort();

  const schemasContent = [
    '// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.',
    '// Generated by server/scripts/sync-registry.cjs',
    ...(acc.schemaExports.length > 0 ? acc.schemaExports : ['export {};']),
    '',
  ].join('\n');

  const modulesContent = [
    '// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.',
    '// Generated by server/scripts/sync-registry.cjs',
    "import type { ServerModuleManifest } from './moduleManifest.types';",
    ...acc.manifestImports,
    '',
    'export const registeredModuleManifests: ServerModuleManifest[] = [',
    ...acc.manifestList,
    '];',
    '',
  ].join('\n');

  const permsContent = [
    '// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.',
    '// Generated by server/scripts/sync-registry.cjs (from server/src/modules/**/security.csv)',
    "import type { ServerModulePermissions, SecurityRuleDefinition } from './moduleManifest.types';",
    '',
    'export const registeredSecurityRules: SecurityRuleDefinition[] = [',
    ...acc.securityRulesList,
    '];',
    '',
    'export const registeredModulePermissions: ServerModulePermissions[] = [',
    ...acc.permissionsList,
    '];',
    '',
    'export const ALL_SYSTEM_PERMISSION_CODES = [',
    ...combinedAllCodes.map((c) => `  '${c}',`),
    '] as const;',
    '',
    'export type SystemPermissionCode = typeof ALL_SYSTEM_PERMISSION_CODES[number];',
    '',
  ].join('\n');

  const contractsPermsContent = [
    '// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.',
    '// Generated by server/scripts/sync-registry.cjs (from server/src/modules/**/security.csv)',
    '',
    'export const BASE_SYSTEM_PERMISSION_CODES = [',
    ...BASE_SYSTEM_PERMISSION_CODES.map((c) => `  '${c}',`),
    '] as const;',
    '',
    'export const DISCOVERED_MODULE_PERMISSION_CODES = [',
    ...sortedDiscoveredCodes.map((c) => `  '${c}',`),
    '] as const;',
    '',
    'export const ALL_SYSTEM_PERMISSION_CODES = [',
    ...combinedAllCodes.map((c) => `  '${c}',`),
    '] as const;',
    '',
    'export type BaseSystemPermissionCode = typeof BASE_SYSTEM_PERMISSION_CODES[number];',
    'export type DiscoveredModulePermissionCode = typeof DISCOVERED_MODULE_PERMISSION_CODES[number];',
    'export type SystemPermissionCode = typeof ALL_SYSTEM_PERMISSION_CODES[number];',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(schemasOutFile), { recursive: true });
  fs.mkdirSync(path.dirname(modulesOutFile), { recursive: true });
  fs.mkdirSync(path.dirname(contractsPermsOutFile), { recursive: true });

  for (const [outFile, content] of [
    [schemasOutFile, schemasContent],
    [modulesOutFile, modulesContent],
    [permsOutFile, permsContent],
    [contractsPermsOutFile, contractsPermsContent],
  ]) {
    const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : null;
    if (prev !== content) {
      fs.writeFileSync(outFile, content, 'utf8');
    }
  }

  // Trigger contracts barrel synchronization if available
  try {
    const { syncContractsBarrel } = require('../../packages/contracts/scripts/sync-barrel.js');
    syncContractsBarrel();
  } catch {}
}

syncServerRegistry();
module.exports = { syncServerRegistry, parseSecurityCsv };
