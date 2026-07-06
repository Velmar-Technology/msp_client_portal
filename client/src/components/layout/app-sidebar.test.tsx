import { render, screen, waitFor } from '@testing-library/react';
import { AppSidebar } from './app-sidebar';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../hooks/useAuth';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../services/subscriptionService', () => ({
  subscriptionService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar-content">{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar-header">{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar-footer">{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children, isActive }: { children: React.ReactNode; isActive?: boolean }) => (
    <button className={isActive ? 'active' : ''}>{children}</button>
  ),
  SidebarMenuSub: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuSubButton: ({ children, isActive }: { children: React.ReactNode; isActive?: boolean }) => (
    <button className={isActive ? 'active' : ''}>{children}</button>
  ),
}));

vi.mock('../ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders active subscription card for CLIENT with active plan', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      {
        id: 'sub-1',
        client_id: 'client-123',
        service_name: 'Standard Support',
        plan: 'STANDARD',
        status: 'ACTIVE',
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ]);

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    // Wait for the async subscription load and assert rendering
    await waitFor(() => {
      expect(screen.getByText('STANDARD')).toBeInTheDocument();
      expect(screen.getByText('Standard Support')).toBeInTheDocument();
      expect(screen.getByText(/dashboard.tableRenewal/)).toBeInTheDocument();
    });
  });

  test('does not render card if CLIENT has no active plans', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    // Excluded active status
    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      {
        id: 'sub-1',
        client_id: 'client-123',
        service_name: 'Expired Plan Support',
        plan: 'STANDARD',
        status: 'EXPIRED',
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ]);

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    // Sidebar should be checked and card should not be displayed
    await waitFor(() => {
      expect(subscriptionService.getAll).toHaveBeenCalled();
    });

    expect(screen.queryByText('STANDARD Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Expired Plan Support')).not.toBeInTheDocument();
  });

  test('does not query subscription or render card for ADMIN role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', name: 'Admin User', role: 'ADMIN', email: 'admin@example.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );

    // Admin should not invoke subscriptions retrieval
    expect(subscriptionService.getAll).not.toHaveBeenCalled();
    expect(screen.queryByText(/Plan/)).not.toBeInTheDocument();
  });
});
