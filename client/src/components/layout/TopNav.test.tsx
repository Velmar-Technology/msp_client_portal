import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopNav } from "@/components/layout/TopNav";
import { expect, test, vi, beforeEach } from 'vitest';
import { ticketService } from "@/features/tickets";
import { invoiceService } from "@/services/invoiceService";

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Stable references mirror react-i18next's contract (memoized t / i18n instances).
// Unstable identities here would re-trigger effects on every render.
const stableT = (key: string) => key;
const stableI18n = { language: 'en_US', changeLanguage: vi.fn() };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
    i18n: stableI18n,
  }),
}));

const mockLogout = vi.fn();
const mockUser = { name: 'John Doe', email: 'john@example.com', role: 'CLIENT' };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    isAuthenticated: true,
  }),
}));

vi.mock('../ui/sidebar', () => ({
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Trigger</button>,
}));

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

vi.mock('./NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

vi.mock('@/features/tickets', () => ({
  ticketService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../services/invoiceService', () => ({
  invoiceService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../lib/faqs', () => ({
  faqsEn: [
    { id: 1, question: 'How do I create a ticket?', answer: 'Navigate to tickets...', category: 'tickets' },
  ],
  faqsEs: [
    { id: 1, question: '¿Cómo creo un ticket?', answer: 'Navegar a tickets...', category: 'tickets' },
  ],
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ticketService.getAll).mockResolvedValue({
    data: [
      { id: 't1', title: 'Network Outage', category: 'SERVICE_OUTAGE', status: 'OPEN', priority: 'HIGH', created_at: '2026-06-22' } as any,
    ],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
  vi.mocked(invoiceService.getAll).mockResolvedValue({
    data: [
      { id: 'inv1', invoice_number: 'INV-2026-001', amount: 100, tax_amount: 16, total: 116, status: 'PAID', invoice_date: '2026-06-22' } as any,
    ],
    pagination: { total: 1, totalPages: 1 },
  });
});

test('renders TopNav search input', () => {
  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');
  expect(searchInput).toBeInTheDocument();
});

test('shows Quick Actions dropdown on input focus', async () => {
  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');

  // Focus the input
  fireEvent.focus(searchInput);

  // Should render quick actions header
  expect(screen.getByText('topNav.quickLinks')).toBeInTheDocument();

  // Should render page links (e.g. nav.dashboard, nav.tickets)
  expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
  expect(screen.getByText('nav.tickets')).toBeInTheDocument();
});

test('performs search query and displays results from all categories', async () => {
  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');

  // Enter search text
  fireEvent.change(searchInput, { target: { value: 'ticket' } });
  fireEvent.focus(searchInput);

  // Wait for debounce and async fetches
  await waitFor(() => {
    // Check FAQ match
    expect(screen.getByText('How do I create a ticket?')).toBeInTheDocument();
    // Check API ticket match
    expect(screen.getByText('Network Outage')).toBeInTheDocument();
    // Check page match
    expect(screen.getByText('nav.tickets')).toBeInTheDocument();
  }, { timeout: 500 });
});

test('handles keyboard navigation and selects active item', async () => {
  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');

  fireEvent.focus(searchInput);

  // Press ArrowDown to select next item
  fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
  // Press Enter to navigate to the selected item
  fireEvent.keyDown(searchInput, { key: 'Enter' });

  expect(mockNavigate).toHaveBeenCalled();
});

test('closes search dropdown on pressing Escape', async () => {
  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');

  fireEvent.focus(searchInput);
  expect(screen.getByText('topNav.quickLinks')).toBeInTheDocument();

  // Press Escape
  fireEvent.keyDown(searchInput, { key: 'Escape' });

  // Dropdown should be closed
  expect(screen.queryByText('topNav.quickLinks')).not.toBeInTheDocument();
});

test('allows user to find ticket with a chunk of id data like "ce9d703a"', async () => {
  vi.mocked(ticketService.getAll).mockResolvedValue({
    data: [
      {
        id: 'ce9d703a-5678-90ab-cdef-1234567890ab',
        title: 'Printer connectivity failure',
        category: 'REPAIR',
        status: 'OPEN',
        priority: 'MEDIUM',
        created_at: '2026-08-20',
      } as any,
    ],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });

  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');

  fireEvent.change(searchInput, { target: { value: 'ce9d703a' } });
  fireEvent.focus(searchInput);

  await waitFor(() => {
    expect(ticketService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'ce9d703a' }),
      expect.anything()
    );
    expect(screen.getByText('Printer connectivity failure')).toBeInTheDocument();
    expect(screen.getByText('#ce9d703a • REPAIR')).toBeInTheDocument();
  }, { timeout: 500 });
});

test('allows user to find ticket when prefixed with hash like "#ce9d703a"', async () => {
  vi.mocked(ticketService.getAll).mockResolvedValue({
    data: [
      {
        id: 'ce9d703a-5678-90ab-cdef-1234567890ab',
        title: 'Printer connectivity failure',
        category: 'REPAIR',
        status: 'OPEN',
        priority: 'MEDIUM',
        created_at: '2026-08-20',
      } as any,
    ],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });

  render(<TopNav />);
  const searchInput = screen.getByPlaceholderText('topNav.search');

  fireEvent.change(searchInput, { target: { value: '#ce9d703a' } });
  fireEvent.focus(searchInput);

  await waitFor(() => {
    expect(ticketService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'ce9d703a' }),
      expect.anything()
    );
    expect(screen.getByText('Printer connectivity failure')).toBeInTheDocument();
  }, { timeout: 500 });
});

