import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from './useWorkspaceStore';

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ activeTenant: null });
  });

  it('initializes with null activeTenant representing home workspace', () => {
    expect(useWorkspaceStore.getState().activeTenant).toBeNull();
  });

  it('updates activeTenant when setActiveTenant is called', () => {
    const tenant = {
      id: 'tenant-123',
      name: 'Acme Global Corp',
      subdomain: 'acme',
    };

    useWorkspaceStore.getState().setActiveTenant(tenant);

    expect(useWorkspaceStore.getState().activeTenant).toEqual(tenant);
  });

  it('resets to home workspace when resetToHome is called', () => {
    useWorkspaceStore.getState().setActiveTenant({
      id: 'tenant-456',
      name: 'Beta LLC',
    });

    expect(useWorkspaceStore.getState().activeTenant).not.toBeNull();

    useWorkspaceStore.getState().resetToHome();

    expect(useWorkspaceStore.getState().activeTenant).toBeNull();
  });
});
