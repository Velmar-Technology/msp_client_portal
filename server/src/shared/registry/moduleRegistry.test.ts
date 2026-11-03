import { describe, it, expect, vi } from 'vitest';
import { Router } from 'express';
import { registeredModuleManifests } from './modules.generated';
import { registeredSecurityRules } from './permissions.generated';
import { resolveModuleRouteMounts, type ServerModuleManifest } from './moduleManifest.types';
import { assets, consumables, consumableCheckouts, tickets, ticketResponses, ticketAttachments, ticketEvents } from '@shared/db';
import {
  PermissionService,
  matchesHierarchicalPermission,
} from '@modules/auth/services/PermissionService';
import { UserRole } from '@shared/types';

describe('moduleRegistry (Zero-Touch Backend Auto-Discovery, Hierarchy & Least Privilege RBAC)', () => {
  it('auto-discovers module manifests and colocated security.csv rules across flat and hierarchical modules', () => {
    const assetsMod = registeredModuleManifests.find((m) => m.id === 'assets');
    expect(assetsMod).toBeDefined();
    expect(assetsMod?.routes?.some((r) => r.prefix === '/assets')).toBe(true);

    // Verify colocated security.csv rules were parsed into registeredSecurityRules
    const assetsReadRule = registeredSecurityRules.find((r) => r.code === 'assets:read');
    expect(assetsReadRule).toEqual({
      code: 'assets:read',
      module: 'assets',
      description: 'View hardware assets and consumables inventory',
      roles: ['ADMIN', 'TECHNICIAN', 'CLIENT'],
    });
    const ticketsDeleteRule = registeredSecurityRules.find((r) => r.code === 'helpdesk:tickets:delete');
    expect(ticketsDeleteRule).toEqual({
      code: 'helpdesk:tickets:delete',
      module: 'helpdesk',
      description: 'Delete support tickets',
      roles: ['ADMIN'],
    });

    const helpdeskMod = registeredModuleManifests.find((m) => m.id === 'helpdesk');
    const ticketsMod = registeredModuleManifests.find((m) => m.id === 'helpdesk.tickets');
    const kbMod = registeredModuleManifests.find((m) => m.id === 'helpdesk.kb');
    expect(helpdeskMod).toBeDefined();
    expect(helpdeskMod?.basePrefix).toBe('/helpdesk');
    expect(helpdeskMod?.routes).toBeUndefined();
    expect(ticketsMod?.parentId).toBe('helpdesk');
    expect(kbMod?.parentId).toBe('helpdesk');

    const mounts = resolveModuleRouteMounts(registeredModuleManifests);
    const prefixes = mounts.map((m) => m.prefix);
    expect(prefixes).toContain('/assets');
    expect(prefixes).toContain('/helpdesk/tickets');
    expect(prefixes).toContain('/helpdesk/kb');
  });

  it('resolves hierarchical child module route prefixes and sorts deeper child mounts before shallower parent mounts', () => {
    const dummyRouter = Router();
    const manifests: ServerModuleManifest[] = [
      {
        id: 'assets',
        routes: [{ prefix: '/assets', router: dummyRouter }],
      },
      {
        id: 'assets.consumables',
        parentId: 'assets',
        routes: [{ prefix: '/consumables', router: dummyRouter }],
      },
      {
        id: 'assets.consumables.history',
        parentId: 'assets.consumables',
        routes: [{ prefix: 'history', router: dummyRouter }],
      },
    ];

    const mounts = resolveModuleRouteMounts(manifests);
    expect(mounts.map((m) => m.prefix)).toEqual([
      '/assets/consumables/history',
      '/assets/consumables',
      '/assets',
    ]);
  });

  it('exposes colocated module Drizzle schemas through @shared/db', () => {
    expect(assets).toBeDefined();
    expect(consumables).toBeDefined();
    expect(consumableCheckouts).toBeDefined();
    expect(tickets).toBeDefined();
    expect(tickets.assigned_tech_id).toBeDefined();
    expect(ticketResponses).toBeDefined();
    expect(ticketAttachments).toBeDefined();
    expect(ticketAttachments.path).toBeDefined();
    expect(ticketEvents).toBeDefined();
    expect(ticketEvents.notes).toBeDefined();
  });

  it('enforces Least Privilege in matchesHierarchicalPermission (explicit sub-module scopes + same-scope action dominance)', () => {
    // 1. Explicit namespace wildcard grants child sub-module capabilities
    expect(matchesHierarchicalPermission(['helpdesk:*'], 'helpdesk:tickets:delete')).toBe(true);
    expect(matchesHierarchicalPermission(['crm:leads:*'], 'crm:leads:write')).toBe(true);
    expect(matchesHierarchicalPermission(['crm:leads:*'], 'crm:quotes:write')).toBe(false);

    // 2. Action dominance (`manage` -> `create`/`update`/`delete`/`read`) within the EXACT same module scope
    expect(matchesHierarchicalPermission(['helpdesk:tickets:manage'], 'helpdesk:tickets:read')).toBe(true);
    expect(matchesHierarchicalPermission(['helpdesk:tickets:manage'], 'helpdesk:tickets:create')).toBe(true);
    expect(matchesHierarchicalPermission(['helpdesk:tickets:manage'], 'helpdesk:tickets:delete')).toBe(true);

    // 3. Strict Least Privilege: parent scope does NOT implicitly leak into child sub-modules
    expect(matchesHierarchicalPermission(['helpdesk:read'], 'helpdesk:tickets:read')).toBe(false);
    expect(matchesHierarchicalPermission(['helpdesk:manage'], 'helpdesk:tickets:delete')).toBe(false);
    expect(matchesHierarchicalPermission(['helpdesk:tickets:manage'], 'helpdesk:manage')).toBe(false);
  });

  it('merges security.csv permissions into PermissionService and syncs catalog + role_permissions idempotently into DB', async () => {
    const mockRepo = {
      getUserPermissions: vi.fn().mockResolvedValue([]),
      upsertPermissions: vi.fn().mockResolvedValue(undefined),
      seedRolePermissions: vi.fn().mockResolvedValue(undefined),
    };
    const mockCache = {
      wrapVersioned: vi.fn((_ns, _t, _k, _ttl, fn) => fn()),
    };

    const service = new PermissionService(mockRepo as never, mockCache as never);

    const adminPerms = await service.getUserPermissions('u-1', 't-1', UserRole.ADMIN);
    expect(adminPerms).toContain('assets:delete');
    expect(adminPerms).toContain('helpdesk:tickets:delete');

    // Technician has atomic read/create/update on helpdesk:tickets, NOT delete
    expect(
      await service.hasPermission('u-2', 't-1', 'helpdesk:tickets:update', UserRole.TECHNICIAN)
    ).toBe(true);
    expect(
      await service.hasPermission('u-2', 't-1', 'helpdesk:tickets:delete', UserRole.TECHNICIAN)
    ).toBe(false);

    // Client has read/create on helpdesk:tickets, NOT update or delete
    expect(
      await service.hasPermission('u-3', 't-1', 'helpdesk:tickets:create', UserRole.CLIENT)
    ).toBe(true);
    expect(
      await service.hasPermission('u-3', 't-1', 'helpdesk:tickets:update', UserRole.CLIENT)
    ).toBe(false);

    // Verify idempotent DB catalog + role_permissions sync from security.csv
    const catalog = await service.syncPermissionCatalog();
    expect(mockRepo.upsertPermissions).toHaveBeenCalledTimes(1);
    expect(mockRepo.seedRolePermissions).toHaveBeenCalledTimes(1);
    expect(
      catalog.some(
        (entry) =>
          entry.code === 'helpdesk:tickets:create' &&
          entry.module === 'helpdesk' &&
          entry.description === 'Create support tickets and responses'
      )
    ).toBe(true);
  });
});
