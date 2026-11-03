import { describe, it, expect, vi } from 'vitest';
import { Router } from 'express';
import { registeredModuleManifests } from './modules.generated';
import { resolveModuleRouteMounts, type ServerModuleManifest } from './moduleManifest.types';
import { assets, consumables, consumableCheckouts } from '@shared/db';
import {
  PermissionService,
  matchesHierarchicalPermission,
} from '@modules/auth/services/PermissionService';
import { UserRole } from '@shared/types';

describe('moduleRegistry (Zero-Touch Backend Auto-Discovery & Hierarchy)', () => {
  it('auto-discovers the assets module manifest with routes and permissions', () => {
    const assetsMod = registeredModuleManifests.find((m) => m.id === 'assets');
    expect(assetsMod).toBeDefined();
    expect(assetsMod?.routes?.some((r) => r.prefix === '/assets')).toBe(true);
    expect(assetsMod?.permissions).toEqual({
      admin: ['assets:read', 'assets:manage'],
      technician: ['assets:read', 'assets:manage'],
      client: ['assets:read'],
    });
  });

  it('resolves hierarchical child module route prefixes under parent module prefix', () => {
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
      '/assets',
      '/assets/consumables',
      '/assets/consumables/history',
    ]);
  });

  it('exposes colocated module Drizzle schemas through @shared/db', () => {
    expect(assets).toBeDefined();
    expect(consumables).toBeDefined();
    expect(consumableCheckouts).toBeDefined();
  });

  it('evaluates hierarchical RBAC permissions (wildcards + parent-to-child action dominance)', () => {
    // 1. Namespace wildcard
    expect(matchesHierarchicalPermission(['assets:*'], 'assets:consumables:manage')).toBe(true);
    expect(matchesHierarchicalPermission(['crm:leads:*'], 'crm:leads:write')).toBe(true);
    expect(matchesHierarchicalPermission(['crm:leads:*'], 'crm:quotes:write')).toBe(false);

    // 2. Parent-to-child scope + action dominance (`manage` -> `write`/`read`, `read` -> `read`)
    expect(matchesHierarchicalPermission(['assets:manage'], 'assets:read')).toBe(true);
    expect(matchesHierarchicalPermission(['assets:manage'], 'assets:consumables:manage')).toBe(true);
    expect(matchesHierarchicalPermission(['assets:manage'], 'assets:consumables:read')).toBe(true);

    expect(matchesHierarchicalPermission(['assets:read'], 'assets:consumables:read')).toBe(true);
    expect(matchesHierarchicalPermission(['assets:read'], 'assets:consumables:manage')).toBe(false);
    expect(matchesHierarchicalPermission(['assets:consumables:manage'], 'assets:manage')).toBe(false);
  });

  it('merges module manifest permissions into PermissionService role defaults and checks hierarchy', async () => {
    const mockRepo = {
      getUserPermissions: vi.fn().mockResolvedValue([]),
    };
    const mockCache = {
      wrapVersioned: vi.fn((_ns, _t, _k, _ttl, fn) => fn()),
    };

    const service = new PermissionService(mockRepo as never, mockCache as never);

    const adminPerms = await service.getUserPermissions('u-1', 't-1', UserRole.ADMIN);
    expect(adminPerms).toContain('assets:read');
    expect(adminPerms).toContain('assets:manage');

    const techPerms = await service.getUserPermissions('u-2', 't-1', UserRole.TECHNICIAN);
    expect(techPerms).toContain('assets:read');
    expect(techPerms).toContain('assets:manage');

    // Technician holding 'assets:manage' automatically satisfies child 'assets:consumables:manage'
    expect(
      await service.hasPermission('u-2', 't-1', 'assets:consumables:manage', UserRole.TECHNICIAN)
    ).toBe(true);

    // Client holding 'assets:read' satisfies child 'assets:consumables:read' but NOT 'assets:consumables:manage'
    expect(
      await service.hasPermission('u-3', 't-1', 'assets:consumables:read', UserRole.CLIENT)
    ).toBe(true);
    expect(
      await service.hasPermission('u-3', 't-1', 'assets:consumables:manage', UserRole.CLIENT)
    ).toBe(false);
  });
});
