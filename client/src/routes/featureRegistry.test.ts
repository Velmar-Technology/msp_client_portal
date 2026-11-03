import { describe, it, expect } from 'vitest';
import { LayoutDashboard, Laptop, Download, Boxes } from 'lucide-react';
import {
  getDiscoveredFeatureManifests,
  getDiscoveredFeatureRoutes,
  mergeFeatureNavItems,
  resolveFeatureRoutes,
  type BaseNavItem,
  type FeatureManifest,
} from './featureRegistry';
import i18n from '@/i18n';

describe('featureRegistry (Zero-Touch Frontend Auto-Discovery & Hierarchy)', () => {
  it('auto-discovers the assets feature manifest and its routes', () => {
    const manifests = getDiscoveredFeatureManifests();
    const assetsManifest = manifests.find((m) => m.id === 'assets');
    expect(assetsManifest).toBeDefined();

    const routes = getDiscoveredFeatureRoutes();
    expect(routes.some((r) => r.path === '/assets')).toBe(true);
  });

  it('merges discovered feature navItems into the right sidebar group and numeric order per role', () => {
    const baseItems: BaseNavItem[] = [
      {
        to: '/dashboard',
        icon: LayoutDashboard,
        labelKey: 'dashboard',
        groupLabelKey: 'sidebar.groups.operations',
        order: 10,
      },
      {
        to: '/devices',
        icon: Laptop,
        labelKey: 'devices',
        order: 20,
      },
      {
        to: '/resources',
        icon: Download,
        labelKey: 'resources',
        order: 30,
      },
    ];

    const clientMerged = mergeFeatureNavItems(baseItems, 'CLIENT');
    const clientPaths = clientMerged.map((item) => item.to);
    expect(clientPaths).toEqual(['/dashboard', '/devices', '/assets', '/resources']);

    const clientAssetsItem = clientMerged.find((item) => item.to === '/assets');
    expect(clientAssetsItem?.requiredFeature).toBeDefined();

    const adminMerged = mergeFeatureNavItems(baseItems, 'ADMIN');
    const adminAssetsItem = adminMerged.find((item) => item.to === '/assets');
    expect(adminAssetsItem).toBeDefined();
    expect(adminAssetsItem?.requiredFeature).toBeUndefined();

    const techMerged = mergeFeatureNavItems(baseItems, 'TECHNICIAN');
    expect(techMerged.some((item) => item.to === '/assets')).toBe(false);
  });

  it('supports hierarchical sidebar sub-items via parentTo sorted by numeric order', () => {
    const baseItems: BaseNavItem[] = [
      {
        to: '/settings-group',
        icon: LayoutDashboard,
        labelKey: 'settings',
        groupLabelKey: 'sidebar.groups.account',
        order: 100,
        items: [
          { to: '/profile', labelKey: 'profile', order: 10 },
          { to: '/billing', labelKey: 'billing', order: 30 },
        ],
      },
    ];

    const customManifests: FeatureManifest[] = [
      {
        id: 'assets',
        navItems: [
          {
            to: '/assets',
            icon: Boxes,
            labelKey: 'assets',
            group: 'operations',
            order: 25,
            roles: ['ADMIN'],
          },
        ],
      },
      {
        id: 'assets.consumables',
        parentId: 'assets',
        navItems: [
          {
            to: '/assets/consumables',
            labelKey: 'consumables',
            parentTo: '/assets',
            order: 20,
            roles: ['ADMIN'],
          },
          {
            to: '/assets/hardware',
            labelKey: 'hardware',
            parentTo: '/assets',
            order: 10,
            roles: ['ADMIN'],
          },
          {
            to: '/settings/audit',
            labelKey: 'auditSettings',
            parentTo: '/settings-group',
            order: 20,
            roles: ['ADMIN'],
          },
        ],
      },
    ];

    const merged = mergeFeatureNavItems(baseItems, 'ADMIN', customManifests);
    const assetsNav = merged.find((i) => i.to === '/assets');
    expect(assetsNav?.items?.map((s) => s.to)).toEqual([
      '/assets/hardware',
      '/assets/consumables',
    ]);

    const settingsNav = merged.find((i) => i.to === '/settings-group');
    expect(settingsNav?.items?.map((s) => s.to)).toEqual([
      '/profile',
      '/settings/audit',
      '/billing',
    ]);
  });

  it('resolves hierarchical child routes (standalone URL prefix + chained breadcrumbs and nested <Outlet />)', () => {
    const manifests: FeatureManifest[] = [
      {
        id: 'assets',
        routes: [
          {
            path: '/assets',
            handle: {
              crumb: () => ({ label: 'Assets', to: '/assets' }),
            },
          },
        ],
      },
      {
        id: 'assets.consumables',
        parentId: 'assets',
        routes: [
          {
            path: 'consumables',
            handle: {
              crumb: () => ({ label: 'Consumables', to: '/assets/consumables' }),
            },
          },
        ],
      },
      {
        id: 'assets.licenses',
        parentId: 'assets',
        mountInsideParentOutlet: true,
        routes: [
          {
            path: 'licenses',
            handle: {
              crumb: () => ({ label: 'Licenses' }),
            },
          },
        ],
      },
    ];

    const resolved = resolveFeatureRoutes(manifests);
    // Standalone child route inherits parent prefix `/assets/consumables` and chains parent crumb
    const consumablesRoute = resolved.find((r) => r.path === '/assets/consumables');
    expect(consumablesRoute).toBeDefined();
    const crumbs = consumablesRoute?.handle?.crumb?.((k) => k, {}, null);
    expect(crumbs).toEqual([
      { label: 'Assets', to: '/assets' },
      { label: 'Consumables', to: '/assets/consumables' },
    ]);

    // `mountInsideParentOutlet: true` attaches inside parent route's `children`
    const parentRoute = resolved.find((r) => r.path === '/assets');
    expect(parentRoute?.children?.map((c) => c.path)).toEqual(['licenses']);
  });

  it('auto-merges colocated feature locale files (en_US.json & es_DO.json) into i18n', () => {
    expect(i18n.getResource('en_US', 'translation', 'nav.assets')).toBe('Assets');
    expect(i18n.getResource('en_US', 'translation', 'assets.title')).toBe('Asset Inventory');
    expect(i18n.getResource('es_DO', 'translation', 'nav.assets')).toBe('Activos');
    expect(i18n.getResource('es_DO', 'translation', 'assets.title')).toBe('Inventario de Activos');
  });
});
