import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeLanguage,
  detectBrowserLanguage,
  getInitialLanguage,
} from './i18n';
import * as authStorage from '@/lib/authStorage';
import enUS from '@/locales/en_US.json';
import esDO from '@/locales/es_DO.json';

describe('i18n Language Resolution & Browser Detection', () => {
  const originalNavigator = window.navigator;
  let mockStore: Record<string, string> = {};

  const mockStorage = {
    getItem: (key: string) => mockStore[key] || null,
    setItem: (key: string, value: string) => {
      mockStore[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStore[key];
    },
    clear: () => {
      mockStore = {};
    },
  };

  beforeEach(() => {
    mockStore = {};
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  describe('normalizeLanguage', () => {
    it('normalizes Spanish variations to es_DO', () => {
      expect(normalizeLanguage('es')).toBe('es_DO');
      expect(normalizeLanguage('es-DO')).toBe('es_DO');
      expect(normalizeLanguage('es_DO')).toBe('es_DO');
      expect(normalizeLanguage('es-ES')).toBe('es_DO');
      expect(normalizeLanguage('es-419')).toBe('es_DO');
      expect(normalizeLanguage('ES-MX')).toBe('es_DO');
    });

    it('normalizes English variations to en_US', () => {
      expect(normalizeLanguage('en')).toBe('en_US');
      expect(normalizeLanguage('en-US')).toBe('en_US');
      expect(normalizeLanguage('en_US')).toBe('en_US');
      expect(normalizeLanguage('en-GB')).toBe('en_US');
      expect(normalizeLanguage('EN-CA')).toBe('en_US');
    });

    it('defaults unsupported or empty languages to en_US', () => {
      expect(normalizeLanguage(null)).toBe('en_US');
      expect(normalizeLanguage(undefined)).toBe('en_US');
      expect(normalizeLanguage('')).toBe('en_US');
      expect(normalizeLanguage('fr-FR')).toBe('en_US');
      expect(normalizeLanguage('de-DE')).toBe('en_US');
      expect(normalizeLanguage('zh-CN')).toBe('en_US');
    });
  });

  describe('detectBrowserLanguage', () => {
    it('detects Spanish from navigator.languages', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          languages: ['es-DO', 'es', 'en-US'],
          language: 'es-DO',
        },
        configurable: true,
        writable: true,
      });

      expect(detectBrowserLanguage()).toBe('es_DO');
    });

    it('detects English from navigator.languages', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          languages: ['en-US', 'en'],
          language: 'en-US',
        },
        configurable: true,
        writable: true,
      });

      expect(detectBrowserLanguage()).toBe('en_US');
    });

    it('detects from single navigator.language when languages array is empty', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          languages: [],
          language: 'es-ES',
        },
        configurable: true,
        writable: true,
      });

      expect(detectBrowserLanguage()).toBe('es_DO');
    });

    it('returns null when browser language is unsupported', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          languages: ['pt-BR', 'fr-FR'],
          language: 'pt-BR',
        },
        configurable: true,
        writable: true,
      });

      expect(detectBrowserLanguage()).toBeNull();
    });
  });

  describe('getInitialLanguage precedence', () => {
    it('prioritizes authenticated user profile language over everything else', () => {
      vi.spyOn(authStorage, 'getAuthItem').mockReturnValue(
        JSON.stringify({ id: 'u1', language: 'es_DO' })
      );
      localStorage.setItem('language', 'en_US');
      Object.defineProperty(window, 'navigator', {
        value: { languages: ['en-US'], language: 'en-US' },
        configurable: true,
        writable: true,
      });

      expect(getInitialLanguage()).toBe('es_DO');
    });

    it('uses manual localStorage selection when no authenticated user exists', () => {
      vi.spyOn(authStorage, 'getAuthItem').mockReturnValue(null);
      localStorage.setItem('language', 'es_DO');
      Object.defineProperty(window, 'navigator', {
        value: { languages: ['en-US'], language: 'en-US' },
        configurable: true,
        writable: true,
      });

      expect(getInitialLanguage()).toBe('es_DO');
    });

    it('detects and uses browser language when no user profile or localStorage preference exists', () => {
      vi.spyOn(authStorage, 'getAuthItem').mockReturnValue(null);
      Object.defineProperty(window, 'navigator', {
        value: { languages: ['es-419', 'en-US'], language: 'es-419' },
        configurable: true,
        writable: true,
      });

      expect(getInitialLanguage()).toBe('es_DO');
    });

    it('falls back to en_US when no preferences exist and browser language is unsupported', () => {
      vi.spyOn(authStorage, 'getAuthItem').mockReturnValue(null);
      Object.defineProperty(window, 'navigator', {
        value: { languages: ['ja-JP'], language: 'ja-JP' },
        configurable: true,
        writable: true,
      });

      expect(getInitialLanguage()).toBe('en_US');
    });
  });

  describe('Universal Locale Key Parity', () => {
    const extractKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        const val = obj[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          keys = keys.concat(extractKeys(val as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    };

    it('enforces 100% bidirectional parity between en_US and es_DO across all namespaces', () => {
      const enKeys = new Set(extractKeys(enUS));
      const esKeys = new Set(extractKeys(esDO));

      const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));
      const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));

      expect(missingInEs, `Missing in es_DO.json: ${missingInEs.join(', ')}`).toEqual([]);
      expect(missingInEn, `Missing in en_US.json: ${missingInEn.join(', ')}`).toEqual([]);
      expect(enKeys.size).toBeGreaterThan(0);
      expect(enKeys.size).toBe(esKeys.size);
    });

    it('ensures en_US and es_DO featureLocked sections have full key parity', () => {
      expect(enUS.featureLocked).toBeDefined();
      expect(esDO.featureLocked).toBeDefined();

      const enKeys = Object.keys(enUS.featureLocked).sort();
      const esKeys = Object.keys(esDO.featureLocked).sort();

      expect(enKeys).toEqual(esKeys);
      expect((enUS.nav as any).upgradeBadge).toBeDefined();
      expect((esDO.nav as any).upgradeBadge).toBeDefined();
    });
  });
});
