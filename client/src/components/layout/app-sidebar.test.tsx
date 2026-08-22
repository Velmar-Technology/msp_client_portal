import { render, screen, waitFor } from '@testing-library/react';
import { AppSidebar } from "@/components/layout/app-sidebar";
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { subscriptionService } from "@/services/subscriptionService";
import { planService, type Plan } from "@/services/planService";
import React from 'react';

const mockT = (key: string) => key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'en-US' },
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

vi.mock('../../services/planService', () => ({
  planService: {
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

vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

const futureDate = (daysAhead: number) => new Date(Date.now() + daysAhead * 86400000).toISOString();

const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'plan-1',
  name: 'Standard Support',
  description: null,
  price: 100,
  features: [],
  recommended: false,
  client_type: 'CLIENT',
  active: true,
  created_at: '',
  updated_at: '',
  ...overrides,
});

const clientUser = {
  user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
  isAuthenticated: true,
};

const makeSub = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  client_id: 'client-123',
  service_name: 'Standard Support',
  plan: 'plan-1',
  status: 'ACTIVE',
  renewal_date: futureDate(30),
  equipment_count: 1,
  tenant_id: 'tenant-1',
  created_at: '2026-06-22',
  updated_at: '2026-06-22',
  ...overrides,
}) as unknown as Awaited<ReturnType<typeof subscriptionService.getAll>>[number];

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(planService.getAll).mockResolvedValue([
      makePlan(),
      makePlan({ id: 'plan-2', name: 'Premium Support' }),
    ]);
  });

  test('renders workspace card with real plan name and group headings for CLIENT', async () => {
    mockUseAuth.mockReturnValue(clientUser);

    vi.mocked(subscriptionService.getAll).mockResolvedValue([makeSub()]);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Standard Support').length).toBeGreaterThan(0);
      expect(screen.getByText(/sidebar\.renewsOn/)).toBeInTheDocument();
      expect(screen.getByText('sidebar.active')).toBeInTheDocument();
    });

    expect(screen.getByText('sidebar.groups.operations')).toBeInTheDocument();
    expect(screen.getByText('sidebar.groups.account')).toBeInTheDocument();
  });

  test('renders expiring state with days remaining for soon-to-expire plan', async () => {
    mockUseAuth.mockReturnValue(clientUser);

    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      makeSub({ status: 'EXPIRING', renewal_date: futureDate(3), id: 'sub-exp' }),
    ]);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('sidebar.expiring')).toBeInTheDocument();
      expect(screen.getByText(/sidebar\.daysRemaining/)).toBeInTheDocument();
    });
  });

  test('renders subscriptions header with count for multiple plans', async () => {
    mockUseAuth.mockReturnValue(clientUser);

    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      makeSub({ id: 'sub-1', plan: 'plan-1', service_name: 'Standard Support' }),
      makeSub({ id: 'sub-2', plan: 'plan-2', service_name: 'Premium Support' }),
    ]);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('sidebar.subscriptions')).toBeInTheDocument();
      expect(screen.getAllByText('Standard Support').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Premium Support').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('does not render card if CLIENT has no active plans', async () => {
    mockUseAuth.mockReturnValue(clientUser);

    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      makeSub({ status: 'EXPIRED' }),
    ]);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(subscriptionService.getAll).toHaveBeenCalled();
    });

    expect(screen.queryByText('Standard Support')).not.toBeInTheDocument();
  });

  test('renders management group headings and no card for ADMIN role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', name: 'Admin User', role: 'ADMIN', email: 'admin@example.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    expect(subscriptionService.getAll).not.toHaveBeenCalled();
    expect(screen.getByText('sidebar.groups.management')).toBeInTheDocument();
    expect(screen.getByText('sidebar.groups.operations')).toBeInTheDocument();
    expect(screen.queryByText(/Plan/)).not.toBeInTheDocument();
  });
});
