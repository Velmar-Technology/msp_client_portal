#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = new Set(args.filter((a) => a.startsWith('--')));

const rawPath = positional[0];

if (!rawPath) {
  console.error('\x1b[31mError:\x1b[0m Please provide a module/feature path.');
  console.log('\nUsage:');
  console.log('  npm run gen:module <domain-or-hierarchy-path> [options]');
  console.log('\nExamples:');
  console.log('  npm run gen:module warranties');
  console.log('  npm run gen:module assets/warranties');
  console.log('  npm run gen:module assets/warranties --with-repo');
  console.log('  npm run gen:module reports --client-only\n');
  process.exit(1);
}

const clientOnly = flags.has('--client-only');
const serverOnly = flags.has('--server-only');
const withRepo = flags.has('--with-repo');
const isContainer = flags.has('--container') || flags.has('--is-group');

const groupArg = args.find((a) => a.startsWith('--group='));
const orderArg = args.find((a) => a.startsWith('--order='));
const rolesArg = args.find((a) => a.startsWith('--roles='));
const navGroup = groupArg ? groupArg.split('=')[1] : 'operations';
const navOrder = orderArg ? Number(orderArg.split('=')[1]) : 55;
// Least Privilege (BL-302 / ADR-017): Deny-by-Default — only ADMIN is granted access unless --roles is explicitly provided
const allowedRoles = rolesArg
  ? rolesArg
      .split('=')[1]
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter((r) => ['ADMIN', 'TECHNICIAN', 'CLIENT'].includes(r))
  : ['ADMIN'];
const rolesLiteral = `[${allowedRoles.map((r) => `'${r}'`).join(', ')}]`;

const segments = rawPath
  .trim()
  .replace(/\\/g, '/')
  .split('/')
  .filter(Boolean)
  .map((seg) =>
    seg
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
  );

const toCamel = (kebab) => kebab.replace(/-([a-z0-9])/g, (_, g) => g.toUpperCase());
const toPascal = (kebab) => {
  const c = toCamel(kebab);
  return c.charAt(0).toUpperCase() + c.slice(1);
};
const toUpper = (kebab) => kebab.replace(/-/g, '_').toUpperCase();
const toSnake = (kebab) => kebab.replace(/-/g, '_');

const relPath = segments.join('/');
const leafKebab = segments[segments.length - 1];
const leafCamel = toCamel(leafKebab);
const leafPascal = toPascal(leafKebab);
const leafUpper = toUpper(leafKebab);
const tableSnake = segments.map(toSnake).join('_');

const isHierarchical = segments.length > 1;
const manifestId = segments.join('.');
const parentId = isHierarchical ? segments.slice(0, -1).join('.') : null;
const parentTo = isHierarchical ? `/${segments.slice(0, -1).join('/')}` : null;
const fullUrlPath = `/${segments.join('/')}`;
const routeMountPrefix = `/${leafKebab}`;
const clientRoutePath = isHierarchical ? leafKebab : `/${leafKebab}`;
const permScope = segments.map(toCamel).join(':');
const techPermsLiteral = allowedRoles.includes('TECHNICIAN')
  ? `['${permScope}:read', '${permScope}:create', '${permScope}:update']`
  : '[]';
const clientPermsLiteral = allowedRoles.includes('CLIENT')
  ? `['${permScope}:read']`
  : '[]';

const contractsTargetDir = path.join(ROOT_DIR, 'packages', 'contracts', 'src', ...segments);
const serverTargetDir = path.join(ROOT_DIR, 'server', 'src', 'modules', ...segments);
const clientTargetDir = path.join(ROOT_DIR, 'client', 'src', 'features', ...segments);

const createdFiles = [];

function writeGeneratedFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  createdFiles.push(path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'));
}

console.log(
  `\x1b[36mScaffolding ADR-017 Zero-Touch ${isContainer ? 'Parent Container ' : isHierarchical ? 'Hierarchical ' : ''}Module:\x1b[0m ${manifestId} (${leafPascal})\n`
);

if (isContainer) {
  if (!clientOnly) {
    if (fs.existsSync(serverTargetDir)) {
      console.error(`\x1b[31mError:\x1b[0m Server module directory already exists: ${serverTargetDir}`);
      process.exit(1);
    }
    writeGeneratedFile(
      path.join(serverTargetDir, 'manifest.ts'),
      `import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';

/**
 * Self-registering backend container manifest for ${leafPascal} parent domain (ADR-017).
 * Child sub-modules inherit \`basePrefix: '${fullUrlPath}'\` and register their own atomic RBAC permissions.
 */
export const moduleManifest: ServerModuleManifest = {
  id: '${manifestId}',${parentId ? `\n  parentId: '${parentId}',` : ''}
  basePrefix: '${fullUrlPath}',
};
`
    );
    writeGeneratedFile(
      path.join(serverTargetDir, 'index.ts'),
      `export { moduleManifest } from './manifest';\n`
    );
  }

  if (!serverOnly) {
    if (fs.existsSync(clientTargetDir)) {
      console.error(`\x1b[31mError:\x1b[0m Client feature directory already exists: ${clientTargetDir}`);
      process.exit(1);
    }
    writeGeneratedFile(
      path.join(clientTargetDir, 'locales', 'en_US.json'),
      JSON.stringify({ nav: { [leafCamel]: leafPascal } }, null, 2) + '\n'
    );
    writeGeneratedFile(
      path.join(clientTargetDir, 'locales', 'es_DO.json'),
      JSON.stringify({ nav: { [leafCamel]: leafPascal } }, null, 2) + '\n'
    );
    writeGeneratedFile(
      path.join(clientTargetDir, 'routes.tsx'),
      `import type { AppRouteObject } from '@/routes/types';

export const ${leafCamel}Routes: AppRouteObject[] = [
  {
    path: '${clientRoutePath}',
    handle: {
      crumb: (t) => ({ label: t('nav.${leafCamel}'), to: '${fullUrlPath}' }),
    },
  },
];
`
    );
    writeGeneratedFile(
      path.join(clientTargetDir, 'manifest.ts'),
      `import { Boxes } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { ${leafCamel}Routes } from './routes';

/**
 * Self-registering parent container manifest for ${leafPascal} (ADR-017).
 */
export const featureManifest: FeatureManifest = {
  id: '${manifestId}',${parentId ? `\n  parentId: '${parentId}',` : ''}
  routes: ${leafCamel}Routes,
  navItems: [
    {
      to: '${fullUrlPath}',${parentTo ? `\n      parentTo: '${parentTo}',` : ''}
      icon: Boxes,
      labelKey: '${leafCamel}',
      group: '${navGroup}',
      order: ${navOrder},
    },
  ],
};
`
    );
    writeGeneratedFile(
      path.join(clientTargetDir, 'index.ts'),
      `export { ${leafCamel}Routes } from './routes';\nexport { featureManifest } from './manifest';\n`
    );
  }

  const { syncContractsBarrel } = require('../packages/contracts/scripts/sync-barrel.js');
  const { syncServerRegistry } = require('../server/scripts/sync-registry.cjs');
  syncContractsBarrel();
  syncServerRegistry();

  for (const file of createdFiles) {
    console.log(`  \x1b[32m+\x1b[0m ${file}`);
  }
  console.log(
    `\n\x1b[32mSuccess!\x1b[0m Parent container "${manifestId}" (${relPath}) scaffolded with zero edits to central tracked files (ADR-017).\n`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 1. Scaffold Shared Contracts (`packages/contracts/src/<path>/`)
// ---------------------------------------------------------------------------
if (!clientOnly && !serverOnly) {
  if (fs.existsSync(contractsTargetDir)) {
    console.error(`\x1b[31mError:\x1b[0m Contracts directory already exists: ${contractsTargetDir}`);
    process.exit(1);
  }

  writeGeneratedFile(
    path.join(contractsTargetDir, `${leafCamel}.contract.ts`),
    `import { z } from 'zod';

export const ${leafPascal}StatusEnum = z.enum(['ACTIVE', 'ARCHIVED']);
export type ${leafPascal}Status = z.infer<typeof ${leafPascal}StatusEnum>;

export const Create${leafPascal}InputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  status: ${leafPascal}StatusEnum.default('ACTIVE'),
  notes: z.string().max(2000).optional().nullable(),
});

export type Create${leafPascal}Input = z.infer<typeof Create${leafPascal}InputSchema>;

export const Update${leafPascal}InputSchema = Create${leafPascal}InputSchema.partial();
export type Update${leafPascal}Input = z.infer<typeof Update${leafPascal}InputSchema>;

export const ${leafPascal}ParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ${leafPascal}RecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  status: ${leafPascal}StatusEnum,
  notes: z.string().nullable().optional(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type ${leafPascal}Record = z.infer<typeof ${leafPascal}RecordSchema>;
`
  );

  writeGeneratedFile(
    path.join(contractsTargetDir, `${leafCamel}.contract.test.ts`),
    `import { describe, it, expect } from 'vitest';
import {
  Create${leafPascal}InputSchema,
  Update${leafPascal}InputSchema,
} from './${leafCamel}.contract';

describe('${leafPascal} Contract Schemas', () => {
  it('validates a valid Create${leafPascal}Input payload', () => {
    const parsed = Create${leafPascal}InputSchema.parse({
      name: 'Sample ${leafPascal}',
    });
    expect(parsed.name).toBe('Sample ${leafPascal}');
    expect(parsed.status).toBe('ACTIVE');
  });

  it('rejects empty name in Create${leafPascal}InputSchema', () => {
    expect(() => Create${leafPascal}InputSchema.parse({ name: '' })).toThrow();
  });

  it('allows partial updates in Update${leafPascal}InputSchema', () => {
    const parsed = Update${leafPascal}InputSchema.parse({ status: 'ARCHIVED' });
    expect(parsed.status).toBe('ARCHIVED');
  });
});
`
  );
}

// ---------------------------------------------------------------------------
// 2. Scaffold Backend Module (`server/src/modules/<path>/`)
// ---------------------------------------------------------------------------
if (!clientOnly) {
  if (fs.existsSync(serverTargetDir)) {
    console.error(`\x1b[31mError:\x1b[0m Server module directory already exists: ${serverTargetDir}`);
    process.exit(1);
  }

  // <leafCamel>.schema.ts
  writeGeneratedFile(
    path.join(serverTargetDir, `${leafCamel}.schema.ts`),
    `import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from '@shared/db/schema';

export const ${leafCamel}Table = pgTable(
  '${tableSnake}',
  {
    id: uuid('id').primaryKey().default(sql\`uuid_generate_v4()\`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_${tableSnake}_tenant').on(table.tenant_id),
    index('idx_${tableSnake}_status').on(table.status),
  ]
);

export type ${leafPascal}Entity = typeof ${leafCamel}Table.$inferSelect;
export type New${leafPascal}Entity = typeof ${leafCamel}Table.$inferInsert;
`
  );

  // Optional Repository (--with-repo)
  if (withRepo) {
    writeGeneratedFile(
      path.join(serverTargetDir, 'repositories', `${leafPascal}Repository.ts`),
      `import { BaseRepository } from '@shared/repositories/BaseRepository';
import { db } from '@shared/db';
import { ${leafCamel}Table, type ${leafPascal}Entity, type New${leafPascal}Entity } from '../${leafCamel}.schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Data repository for ${leafPascal} persistence operations.
 */
export class ${leafPascal}Repository extends BaseRepository<${leafPascal}Entity> {
  constructor() {
    super(${leafCamel}Table);
  }

  /**
   * Lists all ${leafPascal} records for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of ${leafPascal}Entity rows
   */
  async findAllByTenant(tenantId: string): Promise<${leafPascal}Entity[]> {
    return db
      .select()
      .from(${leafCamel}Table)
      .where(eq(${leafCamel}Table.tenant_id, tenantId))
      .orderBy(desc(${leafCamel}Table.created_at));
  }

  /**
   * Finds a single ${leafPascal} record by ID and tenant.
   *
   * @param id - Record UUID
   * @param tenantId - Tenant UUID
   * @returns Matching row or null
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<${leafPascal}Entity | null> {
    const [row] = await db
      .select()
      .from(${leafCamel}Table)
      .where(and(eq(${leafCamel}Table.id, id), eq(${leafCamel}Table.tenant_id, tenantId)));
    return row ?? null;
  }

  /**
   * Inserts a new ${leafPascal} record.
   *
   * @param data - Insert payload
   * @returns Created ${leafPascal}Entity row
   */
  async createRecord(data: New${leafPascal}Entity): Promise<${leafPascal}Entity> {
    const [created] = await db.insert(${leafCamel}Table).values(data).returning();
    return created;
  }
}

export const ${leafCamel}Repository = new ${leafPascal}Repository();
`
    );
  }

  // Service
  writeGeneratedFile(
    path.join(serverTargetDir, 'services', `${leafPascal}Service.ts`),
    `import { NotFoundError } from '@shared/errors';
import type { Create${leafPascal}Input, Update${leafPascal}Input } from '@shared/contracts';
import type { ${leafPascal}Entity, New${leafPascal}Entity } from '../${leafCamel}.schema';

export interface ${leafPascal}StorePort {
  findAllByTenant(tenantId: string): Promise<${leafPascal}Entity[]>;
  findByIdAndTenant(id: string, tenantId: string): Promise<${leafPascal}Entity | null>;
  createRecord(data: New${leafPascal}Entity): Promise<${leafPascal}Entity>;
}

/**
 * Domain service managing ${leafPascal} lifecycle and business invariants (ADR-017).
 */
export class ${leafPascal}Service {
  constructor(private store?: ${leafPascal}StorePort) {}

  /**
   * Lists all ${leafPascal} records scoped to the active tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of ${leafPascal}Entity records
   */
  async list(tenantId: string): Promise<${leafPascal}Entity[]> {
    if (!this.store) return [];
    return this.store.findAllByTenant(tenantId);
  }

  /**
   * Retrieves a single ${leafPascal} record by ID within the tenant boundary.
   *
   * @param id - Record UUID
   * @param tenantId - Tenant UUID
   * @returns Matching ${leafPascal}Entity
   * @throws {NotFoundError} If record does not exist in tenant
   */
  async getById(id: string, tenantId: string): Promise<${leafPascal}Entity> {
    const record = await this.store?.findByIdAndTenant(id, tenantId);
    if (!record) {
      throw new NotFoundError('${leafPascal} record not found');
    }
    return record;
  }

  /**
   * Creates a new ${leafPascal} record for the tenant.
   *
   * @param tenantId - Tenant UUID
   * @param input - Validated creation input
   * @returns Newly created ${leafPascal}Entity
   */
  async create(tenantId: string, input: Create${leafPascal}Input): Promise<${leafPascal}Entity> {
    if (!this.store) {
      throw new NotFoundError('${leafPascal} store not initialized');
    }
    return this.store.createRecord({
      tenant_id: tenantId,
      name: input.name,
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? null,
    });
  }

  /**
   * Placeholder update hook for ${leafPascal}.
   *
   * @param id - Record UUID
   * @param tenantId - Tenant UUID
   * @param _input - Validated update input
   * @returns Existing ${leafPascal}Entity
   */
  async update(id: string, tenantId: string, _input: Update${leafPascal}Input): Promise<${leafPascal}Entity> {
    return this.getById(id, tenantId);
  }
}

export const ${leafCamel}Service = new ${leafPascal}Service();
`
  );

  // Service Unit Test
  writeGeneratedFile(
    path.join(serverTargetDir, 'services', `${leafPascal}Service.test.ts`),
    `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${leafPascal}Service, type ${leafPascal}StorePort } from './${leafPascal}Service';
import { NotFoundError } from '@shared/errors';

describe('${leafPascal}Service', () => {
  let mockStore: ${leafPascal}StorePort;
  let service: ${leafPascal}Service;

  beforeEach(() => {
    mockStore = {
      findAllByTenant: vi.fn().mockResolvedValue([]),
      findByIdAndTenant: vi.fn().mockResolvedValue(null),
      createRecord: vi.fn().mockImplementation(async (data) => ({
        id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date(),
        updated_at: new Date(),
        ...data,
      })),
    };
    service = new ${leafPascal}Service(mockStore);
  });

  it('lists records for a tenant', async () => {
    const result = await service.list('tenant-1');
    expect(result).toEqual([]);
    expect(mockStore.findAllByTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('throws NotFoundError when record does not exist', async () => {
    await expect(service.getById('missing-id', 'tenant-1')).rejects.toThrow(NotFoundError);
  });

  it('creates a new record with default ACTIVE status', async () => {
    const created = await service.create('tenant-1', { name: 'Item A', status: 'ACTIVE' });
    expect(created.name).toBe('Item A');
    expect(mockStore.createRecord).toHaveBeenCalled();
  });
});
`
  );

  // Controller
  writeGeneratedFile(
    path.join(serverTargetDir, 'controllers', `${leafPascal}Controller.ts`),
    `import { Request, Response } from 'express';
import { ${leafCamel}Service, ${leafPascal}Service } from '../services/${leafPascal}Service';

/**
 * HTTP controller for ${leafPascal} endpoints (Express 5 native async propagation).
 */
export class ${leafPascal}Controller {
  constructor(private service: ${leafPascal}Service = ${leafCamel}Service) {}

  /**
   * Lists all ${leafPascal} items for the authenticated tenant.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async list(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const data = await this.service.list(tenantId);
    res.status(200).json({ status: 'success', data });
  }

  /**
   * Retrieves a single ${leafPascal} item by ID.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async getById(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const data = await this.service.getById(String(req.params.id), tenantId);
    res.status(200).json({ status: 'success', data });
  }

  /**
   * Creates a new ${leafPascal} item.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async create(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const data = await this.service.create(tenantId, req.body);
    res.status(201).json({ status: 'success', data });
  }
}

export const ${leafCamel}Controller = new ${leafPascal}Controller();
`
  );

  // Routes
  writeGeneratedFile(
    path.join(serverTargetDir, 'routes', `${leafCamel}.routes.ts`),
    `import { Router } from 'express';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { requirePermission } from '@shared/middleware/requirePermission';
import { validate } from '@shared/middleware/validationMiddleware';
import { Create${leafPascal}InputSchema } from '@shared/contracts';
import { ${leafCamel}Controller } from '../controllers/${leafPascal}Controller';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('${permScope}:read'), (req, res) =>
  ${leafCamel}Controller.list(req, res)
);

router.get('/:id', requirePermission('${permScope}:read'), (req, res) =>
  ${leafCamel}Controller.getById(req, res)
);

router.post(
  '/',
  requirePermission('${permScope}:create'),
  validate(Create${leafPascal}InputSchema),
  (req, res) => ${leafCamel}Controller.create(req, res)
);

export default router;
`
  );

  // Declarative Dynamic RBAC Matrix (security.csv)
  const readRoles = allowedRoles.join('|');
  const writeRoles = allowedRoles.filter((r) => r === 'ADMIN' || r === 'TECHNICIAN').join('|') || 'ADMIN';
  const topModuleName = segments[0];

  writeGeneratedFile(
    path.join(serverTargetDir, 'security.csv'),
    `code,module,description,roles
${permScope}:read,${topModuleName},View ${leafPascal} records,${readRoles}
${permScope}:create,${topModuleName},Create ${leafPascal} records,${writeRoles}
${permScope}:update,${topModuleName},Update ${leafPascal} records,${writeRoles}
${permScope}:delete,${topModuleName},Delete ${leafPascal} records,ADMIN
`
  );

  // Manifest
  writeGeneratedFile(
    path.join(serverTargetDir, 'manifest.ts'),
    `import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import ${leafCamel}Routes from './routes/${leafCamel}.routes';

/**
 * Self-registering backend manifest for ${leafPascal} (ADR-017 / BL-302).
 * Permissions and default role bindings are declared in \`./security.csv\`.
 */
export const moduleManifest: ServerModuleManifest = {
  id: '${manifestId}',${parentId ? `\n  parentId: '${parentId}',` : ''}
  routes: [
    {
      prefix: '${routeMountPrefix}',
      router: ${leafCamel}Routes,
    },
  ],
};
`
  );

  // Module Public Gateway (index.ts)
  writeGeneratedFile(
    path.join(serverTargetDir, 'index.ts'),
    `export { ${leafCamel}Service, ${leafPascal}Service } from './services/${leafPascal}Service';
export { ${leafCamel}Controller, ${leafPascal}Controller } from './controllers/${leafPascal}Controller';
export { default as ${leafCamel}Routes } from './routes/${leafCamel}.routes';
export { moduleManifest } from './manifest';
`
  );
}

// ---------------------------------------------------------------------------
// 3. Scaffold Frontend Feature (`client/src/features/<path>/`)
// ---------------------------------------------------------------------------
if (!serverOnly) {
  if (fs.existsSync(clientTargetDir)) {
    console.error(`\x1b[31mError:\x1b[0m Client feature directory already exists: ${clientTargetDir}`);
    process.exit(1);
  }

  // locales/en_US.json & es_DO.json
  writeGeneratedFile(
    path.join(clientTargetDir, 'locales', 'en_US.json'),
    JSON.stringify(
      {
        nav: {
          [leafCamel]: leafPascal,
        },
        [leafCamel]: {
          title: leafPascal,
          description: `Manage and monitor ${leafPascal.toLowerCase()} records.`,
          createButton: `New ${leafPascal}`,
          empty: `No ${leafPascal.toLowerCase()} records found.`,
          modalTitle: `Create ${leafPascal}`,
          modalDescription: 'Fill out the details below.',
        },
      },
      null,
      2
    ) + '\n'
  );

  writeGeneratedFile(
    path.join(clientTargetDir, 'locales', 'es_DO.json'),
    JSON.stringify(
      {
        nav: {
          [leafCamel]: leafPascal,
        },
        [leafCamel]: {
          title: leafPascal,
          description: `Gestiona y monitorea los registros de ${leafPascal.toLowerCase()}.`,
          createButton: `Nuevo ${leafPascal}`,
          empty: `No se encontraron registros de ${leafPascal.toLowerCase()}.`,
          modalTitle: `Crear ${leafPascal}`,
          modalDescription: 'Completa los detalles a continuación.',
        },
      },
      null,
      2
    ) + '\n'
  );

  // routes.tsx
  writeGeneratedFile(
    path.join(clientTargetDir, 'routes.tsx'),
    `import type { AppRouteObject } from '@/routes/types';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { RouteSuspenseWrapper, TablePageSkeleton } from '@/components/skeletons';

const ${leafPascal}Page = lazyWithRetry(() =>
  import('./pages/${leafPascal}Page').then((m) => ({ default: m.${leafPascal}Page }))
);

/**
 * ${leafPascal} Domain Route Manifest (ADR-017)
 */
export const ${leafCamel}Routes: AppRouteObject[] = [
  {
    path: '${clientRoutePath}',
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <${leafPascal}Page />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t('nav.${leafCamel}'), to: '${fullUrlPath}' }),
      requiredPermission: '${permScope}:read',
    },
  },
];
`
  );

  // manifest.ts
  writeGeneratedFile(
    path.join(clientTargetDir, 'manifest.ts'),
    `import { Boxes } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { ${leafCamel}Routes } from './routes';

/**
 * Self-registering Feature Manifest for ${leafPascal} (ADR-017 / BL-302).
 */
export const featureManifest: FeatureManifest = {
  id: '${manifestId}',${parentId ? `\n  parentId: '${parentId}',` : ''}
  routes: ${leafCamel}Routes,
  navItems: [
    {
      to: '${fullUrlPath}',${parentTo ? `\n      parentTo: '${parentTo}',` : `\n      icon: Boxes,\n      group: '${navGroup}',`}
      labelKey: '${leafCamel}',
      order: ${navOrder},
      requiredPermission: '${permScope}:read',
    },
  ],
};
`
  );

  // api/<leafCamel>Service.ts
  writeGeneratedFile(
    path.join(clientTargetDir, 'api', `${leafCamel}Service.ts`),
    `import api from '@/lib/api';

/**
 * ADR-002 / ADR-017: API service client for ${leafPascal}.
 */
export const ${leafCamel}Service = {
  async getAll(): Promise<unknown[]> {
    const res = await api.get('/api/v1${fullUrlPath}');
    return res.data?.data ?? res.data ?? [];
  },

  async getById(id: string): Promise<unknown> {
    const res = await api.get(\`/api/v1${fullUrlPath}/\${id}\`);
    return res.data?.data ?? res.data;
  },

  async create(payload: Record<string, unknown>): Promise<unknown> {
    const res = await api.post('/api/v1${fullUrlPath}', payload);
    return res.data?.data ?? res.data;
  },
};
`
  );

  // api/use<LeafPascal>Queries.ts
  writeGeneratedFile(
    path.join(clientTargetDir, 'api', `use${leafPascal}Queries.ts`),
    `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${leafCamel}Service } from './${leafCamel}Service';

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for ${leafPascal}.
 */
export const ${leafUpper}_QUERY_KEYS = {
  all: ['${manifestId}'] as const,
  lists: () => [...${leafUpper}_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...${leafUpper}_QUERY_KEYS.all, 'detail', id] as const,
};

export const ${leafCamel}QueryOptions = {
  list: () => ({
    queryKey: ${leafUpper}_QUERY_KEYS.lists(),
    queryFn: () => ${leafCamel}Service.getAll(),
  }),
  detail: (id: string) => ({
    queryKey: ${leafUpper}_QUERY_KEYS.detail(id),
    queryFn: () => ${leafCamel}Service.getById(id),
  }),
};

export function use${leafPascal}List() {
  return useQuery(${leafCamel}QueryOptions.list());
}

export function useCreate${leafPascal}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => ${leafCamel}Service.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${leafUpper}_QUERY_KEYS.lists() });
    },
  });
}
`
  );

  // components/<LeafPascal>Table.tsx
  writeGeneratedFile(
    path.join(clientTargetDir, 'components', `${leafPascal}Table.tsx`),
    `import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ${leafPascal}TableProps {
  items: unknown[];
  onCreateClick?: () => void;
}

export function ${leafPascal}Table({ items, onCreateClick }: ${leafPascal}TableProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {t('${leafCamel}.title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('${leafCamel}.description')}</p>
        </div>
        {onCreateClick && (
          <Button size="sm" onClick={onCreateClick} className="h-7 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('${leafCamel}.createButton')}
          </Button>
        )}
      </div>
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        {items.length === 0 ? (
          <p className="text-center py-6">{t('${leafCamel}.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((_, idx) => (
              <li key={idx} className="py-2">
                #{idx + 1}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
`
  );

  // components/<LeafPascal>Modal.tsx
  writeGeneratedFile(
    path.join(clientTargetDir, 'components', `${leafPascal}Modal.tsx`),
    `import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface ${leafPascal}ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ${leafPascal}Modal({ isOpen, onClose }: ${leafPascal}ModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('${leafCamel}.modalTitle')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          <p>{t('${leafCamel}.modalDescription')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
`
  );

  // hooks/use<LeafPascal>Filters.ts
  writeGeneratedFile(
    path.join(clientTargetDir, 'hooks', `use${leafPascal}Filters.ts`),
    `import { useSearchParams } from 'react-router-dom';

/**
 * ADR-002: URL State Synchronization for ${leafPascal} navigation & filtering.
 */
export function use${leafPascal}Filters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const setSearch = (newSearch: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newSearch) {
        next.set('search', newSearch);
      } else {
        next.delete('search');
      }
      next.set('page', '1');
      return next;
    });
  };

  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  return {
    search,
    page,
    setSearch,
    setPage,
  };
}
`
  );

  // hooks/use<LeafPascal>Modals.ts
  writeGeneratedFile(
    path.join(clientTargetDir, 'hooks', `use${leafPascal}Modals.ts`),
    `import { useState } from 'react';

/**
 * ADR-002: Ephemeral UI modal open/close state.
 */
export function use${leafPascal}Modals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return {
    isCreateOpen,
    openCreate: () => setIsCreateOpen(true),
    closeCreate: () => setIsCreateOpen(false),
  };
}
`
  );

  // pages/<LeafPascal>Page.tsx
  writeGeneratedFile(
    path.join(clientTargetDir, 'pages', `${leafPascal}Page.tsx`),
    `import { use${leafPascal}List } from '../api/use${leafPascal}Queries';
import { ${leafPascal}Table } from '../components/${leafPascal}Table';
import { ${leafPascal}Modal } from '../components/${leafPascal}Modal';
import { use${leafPascal}Modals } from '../hooks/use${leafPascal}Modals';
import { TablePageSkeleton } from '@/components/skeletons';

export function ${leafPascal}Page() {
  const { data: items = [], isLoading } = use${leafPascal}List();
  const { isCreateOpen, openCreate, closeCreate } = use${leafPascal}Modals();

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <${leafPascal}Table items={items as unknown[]} onCreateClick={openCreate} />
      <${leafPascal}Modal isOpen={isCreateOpen} onClose={closeCreate} />
    </div>
  );
}
`
  );

  // pages/<LeafPascal>Page.test.tsx
  writeGeneratedFile(
    path.join(clientTargetDir, 'pages', `${leafPascal}Page.test.tsx`),
    `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${leafPascal}Page } from './${leafPascal}Page';

vi.mock('../api/use${leafPascal}Queries', () => ({
  use${leafPascal}List: () => ({ data: [], isLoading: false }),
}));

describe('${leafPascal}Page', () => {
  it('renders the ${leafPascal} page heading and empty state', () => {
    render(<${leafPascal}Page />);
    expect(screen.getByText('${leafCamel}.title')).toBeDefined();
  });
});
`
  );

  // types.ts
  writeGeneratedFile(
    path.join(clientTargetDir, 'types.ts'),
    `/**
 * ADR-002 INVARIANT:
 * Reserved strictly for local ephemeral UI state.
 * Import entity types and validation schemas directly from "@shared/contracts".
 */

export type ${leafPascal}ViewTab = 'overview' | 'activity';
`
  );

  // index.ts (Public Gateway)
  writeGeneratedFile(
    path.join(clientTargetDir, 'index.ts'),
    `/**
 * ADR-002 / ADR-017: Public API Gateway for ${leafPascal} feature module.
 */

export * from './routes';
export * from './manifest';
export * from './pages/${leafPascal}Page';
export * from './components/${leafPascal}Table';
export * from './components/${leafPascal}Modal';
export * from './api/use${leafPascal}Queries';
export * from './api/${leafCamel}Service';
export * from './hooks/use${leafPascal}Filters';
export * from './hooks/use${leafPascal}Modals';
export * from './types';
`
  );
}

// ---------------------------------------------------------------------------
// 4. Auto-Sync Barrels (`contracts.generated.ts`, `schemas.generated.ts`, `modules.generated.ts`)
// ---------------------------------------------------------------------------
const { syncContractsBarrel } = require('../packages/contracts/scripts/sync-barrel.js');
const { syncServerRegistry } = require('../server/scripts/sync-registry.cjs');
syncContractsBarrel();
syncServerRegistry();

for (const file of createdFiles) {
  console.log(`  \x1b[32m+\x1b[0m ${file}`);
}

console.log(
  `\n\x1b[32mSuccess!\x1b[0m Module "${manifestId}" (${relPath}) scaffolded with zero edits to central tracked files (ADR-017).\n`
);
