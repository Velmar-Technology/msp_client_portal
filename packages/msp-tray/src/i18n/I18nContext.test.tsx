import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n } from './I18nContext';
import { en_US } from './locales/en_US';
import { es_DO } from './locales/es_DO';

describe('i18n Core Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('verifies key parity between en_US and es_DO dictionaries', () => {
    const getDeepKeys = (obj: Record<string, any>, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          keys = keys.concat(getDeepKeys(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    };

    const enKeys = getDeepKeys(en_US);
    const esKeys = getDeepKeys(es_DO);

    expect(enKeys).toEqual(esKeys);
    expect(enKeys.length).toBeGreaterThan(40);

    // Verify no empty translation values
    enKeys.forEach((k) => {
      const enVal = k.split('.').reduce((o: any, i) => o?.[i], en_US);
      const esVal = k.split('.').reduce((o: any, i) => o?.[i], es_DO);
      expect(typeof enVal).toBe('string');
      expect((enVal as string).trim().length).toBeGreaterThan(0);
      expect(typeof esVal).toBe('string');
      expect((esVal as string).trim().length).toBeGreaterThan(0);
    });
  });

  const TestConsumer: React.FC = () => {
    const { locale, setLocale, t } = useI18n();
    return (
      <div>
        <span data-testid="locale">{locale}</span>
        <span data-testid="title">{t('gate.title')}</span>
        <span data-testid="interpolated">
          {t('gate.expiresIn', { time: '10m 00s' })}
        </span>
        <span data-testid="fallback">{t('non.existent.key' as any)}</span>
        <button data-testid="switch-es" onClick={() => setLocale('es_DO')}>
          Spanish
        </button>
        <button data-testid="switch-en" onClick={() => setLocale('en_US')}>
          English
        </button>
      </div>
    );
  };

  it('renders default en_US translations and supports interpolation and fallback', () => {
    render(
      <I18nProvider initialLocale="en_US">
        <TestConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale').textContent).toBe('en_US');
    expect(screen.getByTestId('title').textContent).toBe('Workstation Activation Required');
    expect(screen.getByTestId('interpolated').textContent).toBe('Expires in 10m 00s');
    expect(screen.getByTestId('fallback').textContent).toBe('non.existent.key');
  });

  it('switches language dynamically and persists to localStorage', async () => {
    const onLocaleChange = vi.fn();
    render(
      <I18nProvider initialLocale="en_US" onLocaleChange={onLocaleChange}>
        <TestConsumer />
      </I18nProvider>
    );

    const switchBtn = screen.getByTestId('switch-es');
    await act(async () => {
      fireEvent.click(switchBtn);
    });

    expect(screen.getByTestId('locale').textContent).toBe('es_DO');
    expect(screen.getByTestId('title').textContent).toBe('Activación de Estación Requerida');
    expect(screen.getByTestId('interpolated').textContent).toBe('Vence en 10m 00s');
    expect(localStorage.getItem('msp_tray_locale')).toBe('es_DO');
    expect(onLocaleChange).toHaveBeenCalledWith('es_DO');
  });

  it('auto-detects Spanish from navigator.language when localStorage is empty', () => {
    const originalLanguage = navigator.language;
    Object.defineProperty(navigator, 'language', {
      value: 'es-DO',
      configurable: true,
    });

    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale').textContent).toBe('es_DO');

    // Restore
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    });
  });
});
