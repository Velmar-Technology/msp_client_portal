import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from './usePermissions';
import { useAuthStore } from '@/store/useAuthStore';

describe('usePermissions', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('returns false for everything when no user is logged in', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('crm:leads:read')).toBe(false);
    expect(result.current.canAny('crm:leads:read', 'tickets:read')).toBe(false);
  });

  it('evaluates exact permission codes from user object', () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        role: 'CLIENT',
        language: 'en_US',
        tenantId: 't1',
        permissions: ['crm:leads:read', 'tickets:create'],
      },
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('crm:leads:read')).toBe(true);
    expect(result.current.can('crm:leads:write')).toBe(false);
    expect(result.current.canAny('crm:leads:write', 'tickets:create')).toBe(true);
    expect(result.current.canAll('crm:leads:read', 'tickets:create')).toBe(true);
    expect(result.current.canAll('crm:leads:read', 'crm:leads:write')).toBe(false);
  });

  it('automatically grants all permissions to ADMIN users as backwards-compatible fallback', () => {
    useAuthStore.setState({
      user: {
        id: '2',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        language: 'en_US',
        tenantId: 't1',
        permissions: [],
      },
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('any:random:permission')).toBe(true);
    expect(result.current.canAll('crm:leads:write', 'system:audit')).toBe(true);
  });
});
