import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextcloudService, nextcloudService } from './NextcloudService';
import { env } from '@shared/config/env';

describe('NextcloudService', () => {
  const originalEnv = { ...env };

  beforeEach(() => {
    vi.restoreAllMocks();
    // Set standard mock values in config
    env.NEXTCLOUD_URL = 'http://192.168.0.100:30027';
    env.NEXTCLOUD_APP_USER = 'truenas_admin';
    env.NEXTCLOUD_APP_PASS = 'somepassword';
    env.NEXTCLOUD_TOTAL_CAPACITY = 5000000000000;
  });

  afterEach(() => {
    // Reset config env values
    Object.assign(env, originalEnv);
  });

  describe('parseQuotaXml', () => {
    it('should successfully parse valid quota XML with numeric available space', () => {
      const mockXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/remote.php/dav/files/truenas_admin/</d:href>
    <d:propstat>
      <d:prop>
        <d:quota-used-bytes>1500000000000</d:quota-used-bytes>
        <d:quota-available-bytes>3500000000000</d:quota-available-bytes>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

      const result = nextcloudService.parseQuotaXml(mockXml);

      expect(result.used).toBe(1500000000000);
      expect(result.available).toBe(3500000000000);
      expect(result.total).toBe(5000000000000);
      expect(result.percentage).toBe(30); // (1.5 / 5.0) * 100
      expect(result.status).toBe('online');
    });

    it('should handle unlimited quota (negative or string)', () => {
      const mockXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:propstat>
      <d:prop>
        <d:quota-used-bytes>1000000</d:quota-used-bytes>
        <d:quota-available-bytes>-3</d:quota-available-bytes>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

      const result = nextcloudService.parseQuotaXml(mockXml);

      expect(result.used).toBe(1000000);
      expect(result.available).toBe(4999999000000);
      expect(result.total).toBe(5000000000000);
      expect(result.percentage).toBe(0);
      expect(result.status).toBe('online');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate a password of the requested length', () => {
      const pw = NextcloudService.generateSecurePassword(20);
      expect(pw).toHaveLength(20);
    });

    it('should default to 20 characters', () => {
      const pw = NextcloudService.generateSecurePassword();
      expect(pw).toHaveLength(20);
    });

    it('should contain at least one uppercase letter', () => {
      const pw = NextcloudService.generateSecurePassword();
      expect(pw).toMatch(/[A-Z]/);
    });

    it('should contain at least one lowercase letter', () => {
      const pw = NextcloudService.generateSecurePassword();
      expect(pw).toMatch(/[a-z]/);
    });

    it('should contain at least one digit', () => {
      const pw = NextcloudService.generateSecurePassword();
      expect(pw).toMatch(/[0-9]/);
    });

    it('should contain at least one special character', () => {
      const pw = NextcloudService.generateSecurePassword();
      expect(pw).toMatch(/[!@#$%^&*\-_=+?]/);
    });

    it('should not contain ambiguous characters (0, O, I, l, 1)', () => {
      const pw = NextcloudService.generateSecurePassword();
      expect(pw).not.toMatch(/[0OIl1]/);
    });

    it('should generate unique passwords on each call', () => {
      const passwords = new Set(Array.from({ length: 50 }, () => NextcloudService.generateSecurePassword()));
      expect(passwords.size).toBe(50);
    });
  });

  describe('getStorageUsage', () => {
    it('should return fallback status if Nextcloud configuration is missing', async () => {
      env.NEXTCLOUD_APP_USER = ''; // Clear username

      const result = await nextcloudService.getStorageUsage();

      expect(result.status).toBe('offline');
      expect(result.used).toBe(3600000000000);
      expect(result.total).toBe(5000000000000);
    });

    it('should return real status if WebDAV fetch is successful', async () => {
      const mockXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:propstat>
      <d:prop>
        <d:quota-used-bytes>2000000000000</d:quota-used-bytes>
        <d:quota-available-bytes>2000000000000</d:quota-available-bytes>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXml),
      } as Response);

      const result = await nextcloudService.getStorageUsage();

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.status).toBe('online');
      expect(result.used).toBe(3000000000000);
      expect(result.total).toBe(5000000000000);
      expect(result.percentage).toBe(60);
    });

    it('should return fallback status and log error if WebDAV fetch fails', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

      const result = await nextcloudService.getStorageUsage();

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.status).toBe('offline');
      expect(result.used).toBe(3600000000000);
      expect(result.total).toBe(5000000000000);
    });
  });
});
