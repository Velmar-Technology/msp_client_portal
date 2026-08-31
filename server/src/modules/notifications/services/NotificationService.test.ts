import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Hoist mock handlers
const emailMocks = vi.hoisted(() => ({
  sendTicketCreatedEmail: vi.fn(),
  sendTicketStatusChangedEmail: vi.fn(),
  sendTicketAssignedEmail: vi.fn(),
  sendTicketResponseEmail: vi.fn(),
}));

const whatsappMocks = vi.hoisted(() => ({
  sendTicketStatusWhatsApp: vi.fn(),
}));

const repoMocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

const preferenceMocks = vi.hoisted(() => ({
  shouldNotify: vi.fn().mockResolvedValue(true),
}));

// Apply mocks to dependencies
vi.mock('@shared/utils/emailService', () => emailMocks);
vi.mock('@shared/utils/whatsappService', () => whatsappMocks);
vi.mock('@modules/notifications/repositories/NotificationRepository', () => ({
  notificationRepository: repoMocks,
}));
vi.mock('@modules/notifications/services/NotificationPreferenceService', () => ({
  notificationPreferenceService: preferenceMocks,
}));
vi.mock('@shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import { notificationService } from './NotificationService';
import { Ticket, User, Notification } from '@shared/types';

describe('NotificationService', () => {
  const mockClient: User = {
    id: 'client-123',
    tenant_id: 'tenant-123',
    email: 'client@example.com',
    name: 'Jane Client',
    role: 'CLIENT',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTech: User = {
    id: 'tech-123',
    tenant_id: 'tenant-123',
    email: 'tech@example.com',
    name: 'Tom Tech',
    role: 'TECHNICIAN',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTicket: Ticket = {
    id: 't-12345678-abcd-ef01-2345-6789abcdef01',
    tenant_id: 'tenant-123',
    title: 'Broken Screen',
    description: 'The screen is completely shattered.',
    category: 'REPAIR',
    priority: 'CRITICAL',
    status: 'OPEN',
    client_id: 'client-123',
    assigned_tech_id: 'tech-123',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getConnectedUserIds', () => {
    it('returns user IDs with live SSE connections and removes them on disconnect', () => {
      const makeRes = () => {
        let closeCallback: (() => void) | undefined;
        const res = {
          writeHead: vi.fn(),
          write: vi.fn(),
          on: vi.fn().mockImplementation((event, cb) => {
            if (event === 'close') {
              closeCallback = cb;
            }
          }),
        } as unknown as Response;
        return { res, close: () => closeCallback?.() };
      };

      const first = makeRes();
      const second = makeRes();

      notificationService.registerSSEClient('tech-a', first.res);
      notificationService.registerSSEClient('tech-b', second.res);

      expect(notificationService.getConnectedUserIds()).toEqual(
        expect.arrayContaining(['tech-a', 'tech-b'])
      );

      first.close();
      expect(notificationService.getConnectedUserIds()).toEqual(['tech-b']);

      second.close();
      expect(notificationService.getConnectedUserIds()).toEqual([]);
    });
  });

  describe('registerSSEClient and sendRealTimeUpdate', () => {
    it('should register connection, send connected event, support heartbeats, and cleanup on close', async () => {
      let closeCallback: (() => void) | undefined;
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        on: vi.fn().mockImplementation((event, cb) => {
          if (event === 'close') {
            closeCallback = cb;
          }
        }),
      } as unknown as Response;

      // Register the client
      notificationService.registerSSEClient('user-123', mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
      }));

      expect(mockRes.write).toHaveBeenCalledWith('retry: 10000\n');
      expect(mockRes.write).toHaveBeenCalledWith('event: connected\ndata: {"status":"ok"}\n\n');

      // Test heartbeat interval
      vi.advanceTimersByTime(30000);
      expect(mockRes.write).toHaveBeenCalledWith(': ping\n\n');

      // Mock database insertion for notification
      const mockNotification: Notification = {
        id: 'n-123',
        user_id: 'user-123',
        title: 'New Reply',
        message: 'Hello',
        type: 'NEW_REPLY',
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
        tenant_id: 'tenant-123',
      };
      repoMocks.create.mockResolvedValue(mockNotification);

      // Trigger notification creation which should broadcast to this SSE client
      await notificationService.createInAppNotification({
        userId: 'user-123',
        title: 'New Reply',
        message: 'Hello',
        type: 'NEW_REPLY',
        tenantId: 'tenant-123',
      });

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('event: notification\ndata:')
      );

      // Close connection
      expect(closeCallback).toBeDefined();
      if (closeCallback) {
        closeCallback();
      }
      
      // Clear write mock history
      vi.mocked(mockRes.write).mockClear();

      // Trigger another notification creation - should not write to closed client
      await notificationService.createInAppNotification({
        userId: 'user-123',
        title: 'New Reply',
        message: 'Hello 2',
        type: 'NEW_REPLY',
        tenantId: 'tenant-123',
      });

      expect(mockRes.write).not.toHaveBeenCalledWith(
        expect.stringContaining('Hello 2')
      );
    });
  });

  describe('onTicketCreated', () => {
    it('should dispatch email and in-app notifications if preferences allow', async () => {
      preferenceMocks.shouldNotify.mockImplementation(async () => {
        return true; // allow all
      });

      repoMocks.create.mockResolvedValue({ id: 'notif-1' });

      await notificationService.onTicketCreated(mockTicket, mockClient);

      // Verification of Email
      expect(emailMocks.sendTicketCreatedEmail).toHaveBeenCalledTimes(1);
      expect(emailMocks.sendTicketCreatedEmail).toHaveBeenCalledWith(
        mockClient.email,
        mockClient.name,
        mockTicket,
        'en_US'
      );

      // Verification of In-App to Client
      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockClient.id,
          title: 'Ticket Created successfully',
          type: 'TICKET_CREATED',
        })
      );

      // Verification of In-App to Technician (assigned_tech_id: 'tech-123')
      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockTicket.assigned_tech_id,
          title: 'New Ticket Auto-Assigned',
          type: 'TICKET_ASSIGNED',
        })
      );
    });

    it('should respect shouldNotify channel preferences', async () => {
      preferenceMocks.shouldNotify.mockImplementation(async (userId, eventType, channel) => {
        // block email for client, allow in_app for tech only
        if (userId === mockClient.id && channel === 'email') return false;
        if (userId === mockClient.id && channel === 'in_app') return false;
        return true;
      });

      await notificationService.onTicketCreated(mockTicket, mockClient);

      // Email should NOT be sent to client
      expect(emailMocks.sendTicketCreatedEmail).not.toHaveBeenCalled();

      // In-app should NOT be created for client
      expect(repoMocks.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ user_id: mockClient.id })
      );

      // In-app should STILL be created for tech
      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: mockTech.id })
      );
    });
  });

  describe('onTicketStatusChanged', () => {
    it('should send email, WhatsApp, and in-app updates based on preferences', async () => {
      preferenceMocks.shouldNotify.mockResolvedValue(true);
      const updatedTicket: Ticket = {
        ...mockTicket,
        status: 'IN_PROGRESS',
      };

      await notificationService.onTicketStatusChanged(updatedTicket, mockClient, 'Diagnostics completed');

      expect(emailMocks.sendTicketStatusChangedEmail).toHaveBeenCalledTimes(1);
      expect(emailMocks.sendTicketStatusChangedEmail).toHaveBeenCalledWith(
        mockClient.email,
        mockClient.name,
        updatedTicket,
        expect.stringContaining('Diagnostics completed'),
        'en_US'
      );

      expect(whatsappMocks.sendTicketStatusWhatsApp).toHaveBeenCalledTimes(1);
      expect(whatsappMocks.sendTicketStatusWhatsApp).toHaveBeenCalledWith(
        mockClient.email,
        updatedTicket.id,
        updatedTicket.status,
        expect.stringContaining('Diagnostics completed')
      );

      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockClient.id,
          title: 'Ticket Status: IN_PROGRESS',
        })
      );
    });

    it('should trigger in-app notification to tech if cancelled by client', async () => {
      preferenceMocks.shouldNotify.mockResolvedValue(true);
      const cancelledTicket: Ticket = {
        ...mockTicket,
        status: 'CANCELLED',
      };

      await notificationService.onTicketStatusChanged(cancelledTicket, mockClient);

      // Should notify tech of cancellation
      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockTech.id,
          title: 'Ticket Cancelled by Client',
          type: 'TICKET_CANCELLED',
        })
      );
    });
  });

  describe('onTicketAssigned', () => {
    it('should send assignment email and in-app notification to tech', async () => {
      preferenceMocks.shouldNotify.mockResolvedValue(true);

      await notificationService.onTicketAssigned(mockTicket, mockTech);

      expect(emailMocks.sendTicketAssignedEmail).toHaveBeenCalledWith(
        mockTech.email,
        mockTech.name,
        mockTicket,
        'en_US'
      );

      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockTech.id,
          title: 'Ticket Assigned',
          type: 'TICKET_ASSIGNED',
        })
      );
    });
  });

  describe('onTicketResponseCreated', () => {
    it('should notify recipient of the response', async () => {
      preferenceMocks.shouldNotify.mockResolvedValue(true);

      await notificationService.onTicketResponseCreated(mockTicket, mockClient, 'Tom Tech', 'This is my response.');

      expect(emailMocks.sendTicketResponseEmail).toHaveBeenCalledWith(
        mockClient.email,
        mockClient.name,
        'Tom Tech',
        mockTicket,
        'This is my response.',
        'en_US'
      );

      expect(repoMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockClient.id,
          title: 'New Reply from Tom Tech',
          message: '"This is my response." on ticket: Broken Screen',
        })
      );
    });
  });
});
