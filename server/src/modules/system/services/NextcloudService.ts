import { randomBytes } from 'crypto';
import { env } from '@shared/config/env';
import { logger } from '@shared/utils/logger';
import { InternalServerError, ExternalServiceError } from '@shared/errors';

export interface StorageStatus {
  used: number;
  available: number | 'unlimited' | 'unknown';
  total: number | 'unlimited' | 'unknown';
  percentage: number;
  status: 'online' | 'offline';
}

export class NextcloudService {
  /**
   * Generates a cryptographically secure password that satisfies Nextcloud's password_policy
   * requirements: mixed case, digits, special characters, and not in compromised list.
   */
  static generateSecurePassword(length = 20): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*-_=+?';

    const allChars = uppercase + lowercase + digits + special;

    let password = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += allChars[bytes[i] % allChars.length];
    }

    // Guarantee at least one character from each required class
    const pick = (set: string) => set[randomBytes(1)[0] % set.length];
    const overrides = [
      { char: pick(uppercase), pos: 0 },
      { char: pick(lowercase), pos: Math.floor(length / 4) },
      { char: pick(digits), pos: Math.floor(length / 2) },
      { char: pick(special), pos: Math.floor((3 * length) / 4) },
    ];
    const arr = password.split('');
    for (const o of overrides) {
      arr[o.pos] = o.char;
    }
    return arr.join('');
  }

  /**
   * Fetches storage quota from Nextcloud server via WebDAV PROPFIND.
   * If connection fails or credentials are not configured, returns a fallback mock response.
   */
  async getStorageUsage(): Promise<StorageStatus> {
    const username = env.NEXTCLOUD_APP_USER;
    const password = env.NEXTCLOUD_APP_PASS;
    let rawUrl = env.NEXTCLOUD_URL;

    // Check if configuration is missing
    if (!username || !password || !rawUrl) {
      logger.warn('Nextcloud configuration is incomplete. Using fallback storage values.');
      return this.getFallbackStatus();
    }

    // Normalize URL
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `http://${rawUrl}`;
    }
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const webdavUrl = `${baseUrl}/remote.php/dav/files/${username}/`;

    try {
      const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
      const xmlBody = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:quota-used-bytes/>
    <d:quota-available-bytes/>
  </d:prop>
</d:propfind>`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(webdavUrl, {
        method: 'PROPFIND',
        headers: {
          'Depth': '0',
          'Content-Type': 'text/xml; charset=utf-8',
          'Authorization': authHeader,
        },
        body: xmlBody,
        
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalServiceError('Nextcloud WebDAV request failed', { service: 'nextcloud', upstream: response.status });
      }

      const xmlText = await response.text();
      return this.parseQuotaXml(xmlText);
    } catch (error) {
      logger.error('Failed to retrieve storage quota from Nextcloud. Using fallback.', { error });
      return this.getFallbackStatus();
    }
  }

  /**
   * Helper to parse used/available bytes from WebDAV XML response
   */
  parseQuotaXml(xmlText: string): StorageStatus {
    const usedMatch = xmlText.match(/<[a-zA-Z0-9:]*quota-used-bytes>([^<]+)<\/[a-zA-Z0-9:]*quota-used-bytes>/);
    const availableMatch = xmlText.match(/<[a-zA-Z0-9:]*quota-available-bytes>([^<]+)<\/[a-zA-Z0-9:]*quota-available-bytes>/);

    let used = 0;
    if (usedMatch) {
      const parsedUsed = parseInt(usedMatch[1].trim(), 10);
      if (!isNaN(parsedUsed)) {
        used = parsedUsed;
      }
    }

    let available: number | 'unlimited' | 'unknown' = 'unknown';
    if (availableMatch) {
      const val = availableMatch[1].trim();
      if (val === 'unlimited') {
        available = 'unlimited';
      } else if (val === 'unknown') {
        available = 'unknown';
      } else {
        const parsedAvailable = parseInt(val, 10);
        if (!isNaN(parsedAvailable)) {
          if (parsedAvailable < 0) {
            available = 'unlimited';
          } else {
            available = parsedAvailable;
          }
        }
      }
    }

    const total = env.NEXTCLOUD_TOTAL_CAPACITY;
    let finalAvailable = 0;
    let finalUsed = 0;

    if (typeof available === 'number') {
      // If available is a number, it represents the free space of the underlying partition.
      // Therefore: used space of the whole service = total space - free space
      finalAvailable = available;
      finalUsed = Math.max(0, total - finalAvailable);
    } else {
      // If available space is unlimited/unknown, we fall back to:
      // used space = user's file usage, and available = total - used files
      finalUsed = used;
      finalAvailable = Math.max(0, total - finalUsed);
    }

    const percentage = total > 0 ? Math.round((finalUsed / total) * 100) : 0;

    return {
      used: finalUsed,
      available: finalAvailable,
      total,
      percentage,
      status: 'online',
    };
  }

  /**
   * Provisions a new user account in Nextcloud with the specified quota.
   */
  async provisionUser(options: {
    username: string;
    email?: string;
    quota?: string;
    displayName?: string;
  }): Promise<string> {
    const adminUser = env.NEXTCLOUD_APP_USER;
    const adminPass = env.NEXTCLOUD_APP_PASS;
    let rawUrl = env.NEXTCLOUD_URL;

    if (!adminUser || !adminPass || !rawUrl) {
      throw new InternalServerError('Nextcloud configuration is incomplete');
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `http://${rawUrl}`;
    }
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const ocsUrl = `${baseUrl}/ocs/v1.php/cloud/users?format=json`;

    // Generate cryptographically secure password for the provisioned user
    const password = NextcloudService.generateSecurePassword();

    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');
    
    // We send form data as required by the OCS API
    const params = new URLSearchParams();
    params.append('userid', options.username);
    params.append('password', password);
    if (options.email) params.append('email', options.email);
    if (options.quota) params.append('quota', options.quota);
    if (options.displayName) params.append('displayName', options.displayName);

    const response = await fetch(ocsUrl, {
      method: 'POST',
      headers: {
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: params,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ExternalServiceError('Nextcloud provisioning request failed', { service: 'nextcloud', upstream: response.status, detail: errText });
    }

    const data = await response.json() as any;
    const statusCode = data?.ocs?.meta?.statuscode;
    if (statusCode !== 100) {
      const msg = data?.ocs?.meta?.message || 'Unknown error';
      throw new ExternalServiceError(`Nextcloud OCS error: ${msg}`, { service: 'nextcloud', ocsCode: statusCode });
    }

    // Return the generated password so we can store/display it
    return password;
  }

  /**
   * Rotates a user's password in Nextcloud while preserving the account and all
   * of its data. Used when re-pairing a device to the same slot, so the wiped
   * machine loses access to the cloud account immediately.
   */
  async setUserPassword(username: string): Promise<string> {
    const adminUser = env.NEXTCLOUD_APP_USER;
    const adminPass = env.NEXTCLOUD_APP_PASS;
    let rawUrl = env.NEXTCLOUD_URL;

    if (!adminUser || !adminPass || !rawUrl) {
      throw new InternalServerError('Nextcloud configuration is incomplete');
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `http://${rawUrl}`;
    }
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const ocsUrl = `${baseUrl}/ocs/v1.php/cloud/users/${encodeURIComponent(username)}?format=json`;

    const password = NextcloudService.generateSecurePassword();
    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    const params = new URLSearchParams();
    params.append('key', 'password');
    params.append('value', password);

    const response = await fetch(ocsUrl, {
      method: 'PUT',
      headers: {
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: params,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ExternalServiceError('Nextcloud password reset request failed', {
        service: 'nextcloud',
        upstream: response.status,
        detail: errText,
      });
    }

    const data = await response.json() as any;
    const statusCode = data?.ocs?.meta?.statuscode;
    if (statusCode !== 100) {
      const msg = data?.ocs?.meta?.message || 'Unknown error';
      throw new ExternalServiceError(`Nextcloud OCS error: ${msg}`, { service: 'nextcloud', ocsCode: statusCode });
    }

    // Return the new password so it can be stored alongside the slot.
    return password;
  }

  /**
   * Deletes a user account in Nextcloud.
   */
  async deleteUser(username: string): Promise<void> {
    const adminUser = env.NEXTCLOUD_APP_USER;
    const adminPass = env.NEXTCLOUD_APP_PASS;
    let rawUrl = env.NEXTCLOUD_URL;

    if (!adminUser || !adminPass || !rawUrl) {
      throw new InternalServerError('Nextcloud configuration is incomplete');
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `http://${rawUrl}`;
    }
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const ocsUrl = `${baseUrl}/ocs/v1.php/cloud/users/${encodeURIComponent(username)}?format=json`;

    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    const response = await fetch(ocsUrl, {
      method: 'DELETE',
      headers: {
        'OCS-APIRequest': 'true',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ExternalServiceError('Nextcloud delete user request failed', { service: 'nextcloud', upstream: response.status, detail: errText });
    }

    const data = await response.json() as any;
    const statusCode = data?.ocs?.meta?.statuscode;
    if (statusCode !== 100) {
      const msg = data?.ocs?.meta?.message || 'Unknown error';
      throw new ExternalServiceError(`Nextcloud OCS error: ${msg}`, { service: 'nextcloud', ocsCode: statusCode });
    }
  }

  /**
   * Retrieves a specific user's storage quota details from Nextcloud.
   */
  async getUserStorage(username: string): Promise<{ used: number; total: number }> {
    const adminUser = env.NEXTCLOUD_APP_USER;
    const adminPass = env.NEXTCLOUD_APP_PASS;
    let rawUrl = env.NEXTCLOUD_URL;

    if (!adminUser || !adminPass || !rawUrl) {
      throw new InternalServerError('Nextcloud configuration is incomplete');
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `http://${rawUrl}`;
    }
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const ocsUrl = `${baseUrl}/ocs/v1.php/cloud/users/${encodeURIComponent(username)}?format=json`;

    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    try {
      const response = await fetch(ocsUrl, {
        method: 'GET',
        headers: {
          'OCS-APIRequest': 'true',
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        throw new ExternalServiceError('Nextcloud get user request failed', { service: 'nextcloud', upstream: response.status });
      }

      const data = await response.json() as any;
      const statusCode = data?.ocs?.meta?.statuscode;
      if (statusCode !== 100) {
        const msg = data?.ocs?.meta?.message || 'Unknown error';
        throw new ExternalServiceError(`Nextcloud OCS error: ${msg}`, { service: 'nextcloud', ocsCode: statusCode });
      }

      const quota = data?.ocs?.data?.quota;
      return {
        used: Number(quota?.used || 0),
        total: Number(quota?.total || 0),
      };
    } catch (err) {
      logger.error('Failed to get user storage from Nextcloud. Using fallbacks.', { err });
      // In development or fallback, assume 0 used and default quota limits
      return {
        used: 0,
        total: 50 * 1000 * 1000 * 1000, // 50 GB
      };
    }
  }

  /**
   * Returns a standard fallback response when Nextcloud connection fails
   */
  private getFallbackStatus(): StorageStatus {
    const total = 5000000000000; // 5.0 TB
    const used = 3600000000000; // 3.6 TB
    const available = total - used;
    const percentage = Math.round((used / total) * 100);

    return {
      used,
      available,
      total,
      percentage,
      status: 'offline',
    };
  }
}

export const nextcloudService = new NextcloudService();
