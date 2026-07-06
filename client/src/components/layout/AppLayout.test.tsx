import { render, screen, waitFor } from '@testing-library/react';
import { AppLayout } from './AppLayout';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

vi.mock('../../store/useNotificationStore', () => {
  const store = {
    toasts: [],
    fetchNotifications: vi.fn().mockResolvedValue([]),
    startStream: vi.fn(),
    stopStream: vi.fn(),
  };
  return {
    useNotificationStore: (selector?: (state: any) => any) => {
      if (selector) return selector(store);
      return store;
    },
  };
});

vi.mock('./app-sidebar', () => ({
  AppSidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

vi.mock('./TopNav', () => ({
  TopNav: () => <div data-testid="mock-topnav">TopNav</div>,
}));

vi.mock('../ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar-provider">{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar-inset">{children}</div>,
}));

describe('AppLayout UI Blocker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not block UI for CLIENT user with active subscription', async () => {
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
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Plan Required')).not.toBeInTheDocument();
  });

  test('blocks UI for CLIENT user without active subscription on non-plans route', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Active Plan Required')).toBeInTheDocument();
    });
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  test('does not block UI for CLIENT user without active subscription on /plans route', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/plans']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/plans" element={<div>Plans Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Plans Page Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Plan Required')).not.toBeInTheDocument();
  });

  test('does not block UI for CLIENT user without active subscription on /terms route', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/terms']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/terms" element={<div>Terms Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Terms Page Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Plan Required')).not.toBeInTheDocument();
  });

  test('does not block UI for CLIENT user without active subscription on /privacy route', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/privacy" element={<div>Privacy Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Privacy Page Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Plan Required')).not.toBeInTheDocument();
  });

  test('does not block UI for CLIENT user without active subscription on /help route', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'client-123', name: 'John Client', role: 'CLIENT', email: 'john@client.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/help']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/help" element={<div>Help Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Help Page Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Plan Required')).not.toBeInTheDocument();
  });

  test('does not block UI for ADMIN user without active subscription', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-123', name: 'Admin User', role: 'ADMIN', email: 'admin@example.com', tenantId: 'tenant-1' },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Admin Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Plan Required')).not.toBeInTheDocument();
  });
});
