import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPreferencesPage } from './NotificationPreferencesPage';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useNotificationStore } from '@/store/useNotificationStore';

vi.mock('@/hooks/useNotificationPreferences');
vi.mock('@/store/useNotificationStore');
vi.mock('./NotificationHistorySection', () => ({
  NotificationHistorySection: () => <div data-testid="notification-history-section">Notification History Section Mock</div>,
}));

const mockUseNotificationPreferences = vi.mocked(useNotificationPreferences);
const mockUseNotificationStore = vi.mocked(useNotificationStore);

describe('NotificationPreferencesPage i18n & behavior', () => {
  const mockHandleToggle = vi.fn();
  const mockHandleSave = vi.fn();
  const mockIsLocked = vi.fn().mockImplementation((event: string, channel: string) => channel === 'in_app' && (event === 'TICKET_CREATED' || event === 'TICKET_STATUS_CHANGED'));

  const defaultPreferences = {
    TICKET_CREATED: { in_app: true, email: true, whatsapp: false },
    TICKET_ASSIGNED: { in_app: true, email: true, whatsapp: true },
    TICKET_STATUS_CHANGED: { in_app: true, email: false, whatsapp: false },
    TICKET_CANCELLED: { in_app: false, email: true, whatsapp: false },
    NEW_REPLY: { in_app: true, email: true, whatsapp: true },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationStore.mockImplementation((selector: any) => selector({ unreadCount: 3 }));
    mockUseNotificationPreferences.mockReturnValue({
      preferences: defaultPreferences,
      isLoading: false,
      isSaving: false,
      message: '',
      messageType: '',
      hasChanges: false,
      handleToggle: mockHandleToggle,
      handleSave: mockHandleSave,
      isLocked: mockIsLocked,
    });
  });

  test('renders page title, subtitle, tabs, and channel headers with i18n', () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Notifications & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Manage delivery channels and view alert history')).toBeInTheDocument();

    expect(screen.getAllByText('Delivery Channels')).toHaveLength(2);
    expect(screen.getByText('Notification History')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // unread count badge

    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByText('In-App')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  test('renders event labels and descriptions in matrix', () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ticket Created')).toBeInTheDocument();
    expect(screen.getByText('When a new support ticket is opened')).toBeInTheDocument();

    expect(screen.getByText('Ticket Assigned')).toBeInTheDocument();
    expect(screen.getByText('When a ticket is assigned to a technician')).toBeInTheDocument();

    expect(screen.getByText('Status Changed')).toBeInTheDocument();
    expect(screen.getByText('Ticket Cancelled')).toBeInTheDocument();
    expect(screen.getByText('New Reply')).toBeInTheDocument();
  });

  test('renders unsaved changes indicator and enables Save button when changes exist', () => {
    mockUseNotificationPreferences.mockReturnValue({
      preferences: defaultPreferences,
      isLoading: false,
      isSaving: false,
      message: '',
      messageType: '',
      hasChanges: true,
      handleToggle: mockHandleToggle,
      handleSave: mockHandleSave,
      isLocked: mockIsLocked,
    });

    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);
    expect(mockHandleSave).toHaveBeenCalledTimes(1);
  });

  test('renders Notification History tab trigger and badge', () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    const historyTab = screen.getByRole('tab', { name: /notification history/i });
    expect(historyTab).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
