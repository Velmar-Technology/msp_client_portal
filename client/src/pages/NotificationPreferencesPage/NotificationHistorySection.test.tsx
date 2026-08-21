import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationHistorySection } from './NotificationHistorySection';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';

vi.mock('@/hooks/useNotificationHistory');

const mockUseNotificationHistory = vi.mocked(useNotificationHistory);

describe('NotificationHistorySection i18n & rendering', () => {
  const mockHandleMarkAsRead = vi.fn();
  const mockHandleMarkAllAsRead = vi.fn();
  const mockHandleClearAll = vi.fn();
  const mockHandleRefresh = vi.fn();
  const mockSetSearchQuery = vi.fn();
  const mockSetReadFilter = vi.fn();
  const mockSetTypeFilter = vi.fn();

  const sampleNotifications = [
    {
      id: 'notif-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      title: 'Ticket #101 Created',
      message: 'Your ticket has been created.',
      type: 'TICKET_CREATED',
      read: false,
      link: '/tickets/101',
      created_at: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      title: 'Ticket #102 Assigned',
      message: 'Technician John assigned.',
      type: 'TICKET_ASSIGNED',
      read: true,
      link: '/tickets/102',
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationHistory.mockReturnValue({
      notifications: sampleNotifications as any,
      totalCount: 2,
      unreadCount: 1,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      readFilter: 'ALL',
      setReadFilter: mockSetReadFilter,
      typeFilter: 'ALL',
      setTypeFilter: mockSetTypeFilter,
      handleMarkAsRead: mockHandleMarkAsRead,
      handleMarkAllAsRead: mockHandleMarkAllAsRead,
      handleClearAll: mockHandleClearAll,
      handleRefresh: mockHandleRefresh,
    });
  });

  test('renders translated badges, buttons, tooltips and search input', () => {
    render(<NotificationHistorySection />);

    // Check search placeholder
    expect(screen.getByPlaceholderText('Search notifications...')).toBeInTheDocument();

    // Check badge labels
    expect(screen.getByText('Ticket Created')).toBeInTheDocument();
    expect(screen.getByText('Ticket Assigned')).toBeInTheDocument();

    // Check notification titles & messages
    expect(screen.getByText('Ticket #101 Created')).toBeInTheDocument();
    expect(screen.getByText('Ticket #102 Assigned')).toBeInTheDocument();

    // Check action buttons & tooltips
    expect(screen.getByText('Mark read')).toBeInTheDocument();
    expect(screen.getAllByText('View')).toHaveLength(2);
    expect(screen.getByTitle('Unread')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh notifications')).toBeInTheDocument();
  });

  test('calls handleRefresh on clicking refresh button', () => {
    render(<NotificationHistorySection />);
    const refreshBtn = screen.getByTitle('Refresh notifications');
    fireEvent.click(refreshBtn);
    expect(mockHandleRefresh).toHaveBeenCalledTimes(1);
  });

  test('calls handleMarkAsRead on clicking mark read button', () => {
    render(<NotificationHistorySection />);
    const markReadBtn = screen.getByText('Mark read');
    fireEvent.click(markReadBtn);
    expect(mockHandleMarkAsRead).toHaveBeenCalledWith('notif-1');
  });

  test('renders empty state when no notifications match criteria', () => {
    mockUseNotificationHistory.mockReturnValue({
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      readFilter: 'ALL',
      setReadFilter: mockSetReadFilter,
      typeFilter: 'ALL',
      setTypeFilter: mockSetTypeFilter,
      handleMarkAsRead: mockHandleMarkAsRead,
      handleMarkAllAsRead: mockHandleMarkAllAsRead,
      handleClearAll: mockHandleClearAll,
      handleRefresh: mockHandleRefresh,
    });

    render(<NotificationHistorySection />);

    expect(screen.getByText('No Notifications Found')).toBeInTheDocument();
    expect(screen.getByText("You don't have any notification history yet.")).toBeInTheDocument();
  });
});
