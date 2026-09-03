#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawName = process.argv[2];

if (!rawName) {
  console.error('\x1b[31mError:\x1b[0m Please provide a feature/domain name.');
  console.log('\nUsage:');
  console.log('  npm -w client run gen:feature <domain-name>');
  console.log('  Example: npm -w client run gen:feature devices\n');
  process.exit(1);
}

// Convert input like 'hardware_devices' or 'hardware-devices' or 'devices' to standard formats
const kebabName = rawName
  .trim()
  .toLowerCase()
  .replace(/[\s_]+/g, '-');

const camelName = kebabName.replace(/-([a-z0-9])/g, (_, g) => g.toUpperCase());
const pascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
const upperName = kebabName.replace(/-/g, '_').toUpperCase();

const targetDir = path.resolve(__dirname, '../src/features', kebabName);

if (fs.existsSync(targetDir)) {
  console.error(`\x1b[31mError:\x1b[0m Feature directory "${kebabName}" already exists at:`);
  console.error(`  ${targetDir}`);
  process.exit(1);
}

console.log(`\x1b[36mScaffolding canonical ADR-002 / ADR-003 feature slice:\x1b[0m ${kebabName} (${pascalName})\n`);

// 1. Create directory tree
const dirsToCreate = [
  targetDir,
  path.join(targetDir, 'api'),
  path.join(targetDir, 'components'),
  path.join(targetDir, 'hooks'),
  path.join(targetDir, 'pages'),
];

for (const dir of dirsToCreate) {
  fs.mkdirSync(dir, { recursive: true });
}

// 2. Define canonical template files

const files = [
  // routes.tsx
  {
    path: path.join(targetDir, 'routes.tsx'),
    content: `import type { RouteObject } from 'react-router-dom';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { RouteSuspenseWrapper, TablePageSkeleton } from '@/components/skeletons';

const ${pascalName}Page = lazyWithRetry(() =>
  import('./pages/${pascalName}Page').then((m) => ({ default: m.${pascalName}Page }))
);

/**
 * ${pascalName} Domain Route Manifest (ADR-002 / ADR-003)
 */
export const ${camelName}Routes: RouteObject[] = [
  {
    path: '/${kebabName}',
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <${pascalName}Page />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t('nav.${camelName}', '${pascalName}'), to: '/${kebabName}' }),
    },
  },
];
`,
  },

  // api/use<Pascal>Queries.ts
  {
    path: path.join(targetDir, 'api', `use${pascalName}Queries.ts`),
    content: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${camelName}Service } from './${camelName}Service';

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for ${pascalName}.
 */
export const ${upperName}_QUERY_KEYS = {
  all: ['${kebabName}'] as const,
  lists: () => [...${upperName}_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...${upperName}_QUERY_KEYS.all, 'detail', id] as const,
};

export const ${camelName}QueryOptions = {
  list: () => ({
    queryKey: ${upperName}_QUERY_KEYS.lists(),
    queryFn: () => ${camelName}Service.getAll(),
  }),
  detail: (id: string) => ({
    queryKey: ${upperName}_QUERY_KEYS.detail(id),
    queryFn: () => ${camelName}Service.getById(id),
  }),
};

export function use${pascalName}List() {
  return useQuery(${camelName}QueryOptions.list());
}

export function useCreate${pascalName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => ${camelName}Service.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${upperName}_QUERY_KEYS.lists() });
    },
  });
}
`,
  },

  // api/<camel>Service.ts
  {
    path: path.join(targetDir, 'api', `${camelName}Service.ts`),
    content: `import api from '@/lib/api';

/**
 * ADR-002: API service client for ${pascalName}.
 * Note: Input and response types must be imported directly from "@shared/contracts".
 */
export const ${camelName}Service = {
  async getAll(): Promise<unknown[]> {
    const res = await api.get('/api/v1/${kebabName}');
    return res.data;
  },

  async getById(id: string): Promise<unknown> {
    const res = await api.get(\`/api/v1/${kebabName}/\${id}\`);
    return res.data;
  },

  async create(payload: Record<string, unknown>): Promise<unknown> {
    const res = await api.post('/api/v1/${kebabName}', payload);
    return res.data;
  },
};
`,
  },

  // components/<Pascal>Table.tsx
  {
    path: path.join(targetDir, 'components', `${pascalName}Table.tsx`),
    content: `import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ${pascalName}TableProps {
  items: unknown[];
  onCreateClick?: () => void;
}

export function ${pascalName}Table({ items, onCreateClick }: ${pascalName}TableProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          ${pascalName} ({items.length})
        </h2>
        {onCreateClick && (
          <Button size="sm" onClick={onCreateClick} className="h-7 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('common.create', 'Create')}
          </Button>
        )}
      </div>
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        {items.length === 0 ? (
          <p className="text-center py-6">{t('common.noData', 'No records found.')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((_, idx) => (
              <li key={idx} className="py-2">
                Item #{idx + 1}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
`,
  },

  // components/<Pascal>Modal.tsx
  {
    path: path.join(targetDir, 'components', `${pascalName}Modal.tsx`),
    content: `import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface ${pascalName}ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ${pascalName}Modal({ isOpen, onClose }: ${pascalName}ModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('${camelName}.modalTitle', 'New ${pascalName}')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          {/* Form wired via react-hook-form + zodResolver(@shared/contracts) */}
          <p>{t('${camelName}.modalDescription', 'Fill out the details below.')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
`,
  },

  // hooks/use<Pascal>Filters.ts
  {
    path: path.join(targetDir, 'hooks', `use${pascalName}Filters.ts`),
    content: `import { useSearchParams } from 'react-router-dom';

/**
 * ADR-002: URL State Synchronization for ${pascalName} navigation & filtering.
 */
export function use${pascalName}Filters() {
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
`,
  },

  // hooks/use<Pascal>Modals.ts
  {
    path: path.join(targetDir, 'hooks', `use${pascalName}Modals.ts`),
    content: `import { useState } from 'react';

/**
 * ADR-002: Ephemeral UI modal open/close state.
 */
export function use${pascalName}Modals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return {
    isCreateOpen,
    openCreate: () => setIsCreateOpen(true),
    closeCreate: () => setIsCreateOpen(false),
  };
}
`,
  },

  // pages/<Pascal>Page.tsx
  {
    path: path.join(targetDir, 'pages', `${pascalName}Page.tsx`),
    content: `import { use${pascalName}List } from '../api/use${pascalName}Queries';
import { ${pascalName}Table } from '../components/${pascalName}Table';
import { ${pascalName}Modal } from '../components/${pascalName}Modal';
import { use${pascalName}Modals } from '../hooks/use${pascalName}Modals';
import { TablePageSkeleton } from '@/components/skeletons';

export function ${pascalName}Page() {
  const { data: items = [], isLoading } = use${pascalName}List();
  const { isCreateOpen, openCreate, closeCreate } = use${pascalName}Modals();

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <${pascalName}Table items={items as unknown[]} onCreateClick={openCreate} />
      <${pascalName}Modal isOpen={isCreateOpen} onClose={closeCreate} />
    </div>
  );
}
`,
  },

  // types.ts
  {
    path: path.join(targetDir, 'types.ts'),
    content: `/**
 * ADR-002 INVARIANT:
 * This file is strictly reserved for local ephemeral UI state (tabs, wizard steps, view modes).
 * 
 * FORBIDDEN:
 * Do NOT declare backend entity interfaces, DTOs, or input/output contracts here.
 * Import entity types and validation schemas directly from "@shared/contracts".
 */

export type ${pascalName}ViewTab = 'overview' | 'activity';
`,
  },

  // index.ts (Public Gateway)
  {
    path: path.join(targetDir, 'index.ts'),
    content: `/**
 * ADR-002 / ADR-003: Public API Gateway for ${pascalName} feature module.
 * Only public hooks, pages, components, routes, and ephemeral UI types should be exported here.
 */

// Routes
export * from './routes';

// Pages
export * from './pages/${pascalName}Page';

// Components
export * from './components/${pascalName}Table';
export * from './components/${pascalName}Modal';

// Hooks & Queries
export * from './api/use${pascalName}Queries';
export * from './hooks/use${pascalName}Filters';
export * from './hooks/use${pascalName}Modals';

// Ephemeral UI Types
export * from './types';
`,
  },
];

for (const file of files) {
  fs.writeFileSync(file.path, file.content, 'utf-8');
  console.log(`  \x1b[32m+\x1b[0m ${path.relative(path.resolve(__dirname, '..'), file.path)}`);
}

console.log(`\n\x1b[32mSuccess!\x1b[0m Feature "${kebabName}" created cleanly per ADR-002/ADR-003 specifications.`);
console.log(`Ready to import in router via: import { ${camelName}Routes } from '@/features/${kebabName}';\n`);
