import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface StorageStatus {
  used: number;
  available: number | 'unlimited' | 'unknown';
  total: number | 'unlimited' | 'unknown';
  percentage: number;
  status: 'online' | 'offline';
}

export class NextcloudService {
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
        throw new Error(`WebDAV request failed with status: ${response.status} ${response.statusText}`);
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
