import { vi, describe, it, expect, beforeEach } from 'vitest';

// Use vi.hoisted to declare mock functions before they are referenced in the hoisted vi.mock call
const mocks = vi.hoisted(() => {
  return {
    getEffectivePreferences: vi.fn(),
    upsert: vi.fn(),
  };
});

vi.mock('@modules/notifications/repositories/NotificationPreferenceRepository', () => {
  return {
    notificationPreferenceRepository: {
      getEffectivePreferences: mocks.getEffectivePreferences,
      upsert: mocks.upsert,
    },
    DEFAULT_PREFERENCES: {
      TICKET_CREATED:        { in_app: true, email: true, whatsapp: false },
      TICKET_ASSIGNED:       { in_app: true, email: true, whatsapp: false },
      TICKET_STATUS_CHANGED: { in_app: true, email: true, whatsapp: true },
      TICKET_CANCELLED:      { in_app: true, email: true, whatsapp: false },
      NEW_REPLY:             { in_app: true, email: true, whatsapp: false },
    },
  };
});

import { notificationPreferenceService } from './NotificationPreferenceService';
import { NotificationPreferencesMap } from '@shared/types';

describe('NotificationPreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should call getEffectivePreferences on the repository', async () => {
      const mockPrefs: NotificationPreferencesMap = {
        TICKET_CREATED: { in_app: true, email: true, whatsapp: false },
      };
      mocks.getEffectivePreferences.mockResolvedValue(mockPrefs);

      const result = await notificationPreferenceService.getPreferences('user-123');

      expect(mocks.getEffectivePreferences).toHaveBeenCalledTimes(1);
      expect(mocks.getEffectivePreferences).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('updatePreferences', () => {
    it('should force in_app = true for critical events and fill missing defaults', async () => {
      const inputPrefs: any = {
        TICKET_CREATED: { in_app: false, email: false, whatsapp: false }, // Should force in_app=true
        TICKET_STATUS_CHANGED: { in_app: false, email: true, whatsapp: true }, // Should force in_app=true
        // Other fields missing, should be filled with default preferences
      };

      const mockUpsertResult = { id: 'pref-123', user_id: 'user-123', preferences: inputPrefs };
      mocks.upsert.mockResolvedValue(mockUpsertResult);

      await notificationPreferenceService.updatePreferences('user-123', 'tenant-123', inputPrefs);

      expect(mocks.upsert).toHaveBeenCalledTimes(1);
      
      const upsertedPrefs = mocks.upsert.mock.calls[0][2] as NotificationPreferencesMap;
      
      // Critical events: in_app must be forced to true
      expect(upsertedPrefs.TICKET_CREATED.in_app).toBe(true);
      expect(upsertedPrefs.TICKET_STATUS_CHANGED.in_app).toBe(true);
      
      // Missing events (like TICKET_ASSIGNED) should be populated from default preferences
      expect(upsertedPrefs.TICKET_ASSIGNED).toBeDefined();
      expect(upsertedPrefs.TICKET_ASSIGNED.in_app).toBe(true);
      expect(upsertedPrefs.TICKET_ASSIGNED.email).toBe(true);
      
      expect(upsertedPrefs.NEW_REPLY).toBeDefined();
      expect(upsertedPrefs.NEW_REPLY.in_app).toBe(true);
      expect(upsertedPrefs.NEW_REPLY.email).toBe(true);
    });
  });

  describe('shouldNotify', () => {
    it('should return true if eventPrefs allow notification on channel', async () => {
      const mockPrefs: NotificationPreferencesMap = {
        TICKET_CREATED: { in_app: true, email: false, whatsapp: false },
      };
      mocks.getEffectivePreferences.mockResolvedValue(mockPrefs);

      const notifyInApp = await notificationPreferenceService.shouldNotify('user-123', 'TICKET_CREATED', 'in_app');
      const notifyEmail = await notificationPreferenceService.shouldNotify('user-123', 'TICKET_CREATED', 'email');

      expect(notifyInApp).toBe(true);
      expect(notifyEmail).toBe(false);
    });

    it('should return true (fail-open) if eventPrefs has no config for the event type', async () => {
      mocks.getEffectivePreferences.mockResolvedValue({});

      const result = await notificationPreferenceService.shouldNotify('user-123', 'TICKET_ASSIGNED', 'email');
      expect(result).toBe(true);
    });

    it('should fail-open and return true if repository throws an error', async () => {
      mocks.getEffectivePreferences.mockRejectedValue(new Error('DB connection failed'));

      const result = await notificationPreferenceService.shouldNotify('user-123', 'TICKET_CREATED', 'email');
      
      expect(result).toBe(true);
    });
  });
});
