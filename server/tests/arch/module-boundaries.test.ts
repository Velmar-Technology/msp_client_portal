import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Architectural Boundary Conformance Suite (AGENTS.md Rule 6)
 *
 * Enforces Module Gateway Compliance:
 * 1. Every domain under server/src/modules must have a public index.ts gateway.
 * 2. Cross-module imports between domains MUST use the domain gateway (`@modules/<domain>`),
 *    never internal subpaths (`@modules/<domain>/repositories/...`, `@modules/<domain>/services/...`).
 * 3. Ingress infrastructure (shared middleware, root router, server entrypoint) MUST consume
 *    domain functionality strictly through `@modules/<domain>`.
 */
describe('Architecture Guardrails — AGENTS.md Rule 6 Module Gateway Compliance', () => {
  const serverSrcDir = path.resolve(__dirname, '../../src');
  const modulesDir = path.resolve(serverSrcDir, 'modules');

  // Discover all domains dynamically from server/src/modules
  const domains = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  it('verifies all registered domain modules expose a public index.ts gateway', () => {
    expect(domains.length).toBeGreaterThan(0);

    const missingGateways: string[] = [];
    for (const domain of domains) {
      const indexPath = path.join(modulesDir, domain, 'index.ts');
      if (!fs.existsSync(indexPath)) {
        missingGateways.push(domain);
      }
    }

    expect(missingGateways).toEqual([]);
  });

  it('ensures domain index.ts files export named routers rather than raw wildcards', () => {
    const routerPattern = /export\s+\{\s*default\s+as\s+\w+Routes\s*\}\s+from\s+['"]\.\/routes\//;

    for (const domain of domains) {
      const indexPath = path.join(modulesDir, domain, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      const routesDir = path.join(modulesDir, domain, 'routes');
      if (fs.existsSync(routesDir)) {
        const routeFiles = fs
          .readdirSync(routesDir)
          .filter((f) => f.endsWith('.routes.ts'));

        if (routeFiles.length > 0) {
          expect(
            routerPattern.test(content),
            `Module '${domain}/index.ts' must export its routes as named router exports (e.g. export { default as ${domain}Routes } from './routes/...')`
          ).toBe(true);
        }
      }
    }
  });

  it('forbids cross-module deep subpath imports within server/src/modules', () => {
    const violations: string[] = [];

    function checkDirectory(dir: string, currentDomain: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDirectory(fullPath, currentDomain);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, idx) => {
            const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
            if (!importMatch) return;

            const importPath = importMatch[1];

            // 1. Check alias imports: @modules/<otherDomain>/<subpath>
            for (const otherDomain of domains) {
              if (otherDomain === currentDomain) continue;

              const deepAliasPrefix = `@modules/${otherDomain}/`;
              if (importPath.startsWith(deepAliasPrefix)) {
                const relativeFile = path.relative(serverSrcDir, fullPath).replace(/\\/g, '/');
                violations.push(
                  `${relativeFile}:${idx + 1} imports deep subpath '${importPath}'. Must import from '@modules/${otherDomain}'.`
                );
              }
            }

            // 2. Check relative cross-module imports (e.g. ../../otherDomain/...)
            if (importPath.startsWith('.') && importPath.includes('/modules/')) {
              const resolved = path.resolve(path.dirname(fullPath), importPath);
              const relToModules = path.relative(modulesDir, resolved).replace(/\\/g, '/');
              const targetDomain = relToModules.split('/')[0];

              if (targetDomain && targetDomain !== currentDomain && domains.includes(targetDomain)) {
                const isSubpath = relToModules.split('/').length > 1 && !relToModules.endsWith('/index');
                if (isSubpath) {
                  const relativeFile = path.relative(serverSrcDir, fullPath).replace(/\\/g, '/');
                  violations.push(
                    `${relativeFile}:${idx + 1} uses relative cross-domain import '${importPath}'. Must import from '@modules/${targetDomain}'.`
                  );
                }
              }
            }
          });
        }
      }
    }

    for (const domain of domains) {
      checkDirectory(path.join(modulesDir, domain), domain);
    }

    expect(violations).toEqual([]);
  });

  it('forbids deep module subpath imports in ingress gateway and shared infrastructure', () => {
    const targetDirs = [
      path.join(serverSrcDir, 'shared', 'middleware'),
      path.join(serverSrcDir, 'routes'),
    ];
    const targetFiles = [path.join(serverSrcDir, 'index.ts')];

    const violations: string[] = [];

    function checkFile(filePath: string) {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
        if (!importMatch) return;

        const importPath = importMatch[1];
        for (const domain of domains) {
          const deepPrefix = `@modules/${domain}/`;
          if (importPath.startsWith(deepPrefix)) {
            const relativeFile = path.relative(serverSrcDir, filePath).replace(/\\/g, '/');
            violations.push(
              `${relativeFile}:${idx + 1} imports deep subpath '${importPath}'. Must import from '@modules/${domain}'.`
            );
          }
        }
      });
    }

    for (const file of targetFiles) {
      checkFile(file);
    }

    for (const dir of targetDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true }) as string[];
        for (const f of files) {
          if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
            checkFile(path.join(dir, f));
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
