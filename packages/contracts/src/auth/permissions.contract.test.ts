import { describe, it, expect } from 'vitest';
import {
  ALL_SYSTEM_PERMISSION_CODES,
  BASE_SYSTEM_PERMISSION_CODES,
  DISCOVERED_MODULE_PERMISSION_CODES,
  type SystemPermissionCode,
} from './permissions.contract';

describe('Permissions Contract (ADR-017 Type-Safe RBAC Bridge)', () => {
  it('exports base system permission codes for foundational domains', () => {
    expect(BASE_SYSTEM_PERMISSION_CODES).toContain('users:read');
    expect(BASE_SYSTEM_PERMISSION_CODES).toContain('users:manage');
    expect(BASE_SYSTEM_PERMISSION_CODES).toContain('roles:manage');
    expect(BASE_SYSTEM_PERMISSION_CODES).toContain('crm:leads:read');
    expect(BASE_SYSTEM_PERMISSION_CODES).toContain('invoices:read');
  });

  it('exports discovered module permission codes extracted from security.csv files', () => {
    expect(DISCOVERED_MODULE_PERMISSION_CODES).toContain('assets:read');
    expect(DISCOVERED_MODULE_PERMISSION_CODES).toContain('assets:create');
    expect(DISCOVERED_MODULE_PERMISSION_CODES).toContain('helpdesk:tickets:read');
    expect(DISCOVERED_MODULE_PERMISSION_CODES).toContain('helpdesk:kb:read');
  });

  it('combines base and discovered codes in ALL_SYSTEM_PERMISSION_CODES without duplicates', () => {
    expect(ALL_SYSTEM_PERMISSION_CODES.length).toBeGreaterThanOrEqual(
      BASE_SYSTEM_PERMISSION_CODES.length + DISCOVERED_MODULE_PERMISSION_CODES.length - 5
    );
    const uniqueSet = new Set(ALL_SYSTEM_PERMISSION_CODES);
    expect(uniqueSet.size).toBe(ALL_SYSTEM_PERMISSION_CODES.length);
  });

  it('validates that known permission codes satisfy the SystemPermissionCode type', () => {
    const assetRead: SystemPermissionCode = 'assets:read';
    const ticketCreate: SystemPermissionCode = 'helpdesk:tickets:create';
    const userManage: SystemPermissionCode = 'users:manage';

    expect(assetRead).toBe('assets:read');
    expect(ticketCreate).toBe('helpdesk:tickets:create');
    expect(userManage).toBe('users:manage');
  });
});
