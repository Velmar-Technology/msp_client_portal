import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSavedTheme, applyTheme, getSystemPrefersLight } from './theme';

describe('msp-tray theme service', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to system theme when localStorage is empty', () => {
    expect(getSavedTheme()).toBe('system');
  });

  it('applies dark theme explicitly', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(getSavedTheme()).toBe('dark');
  });

  it('applies light theme explicitly with #d6d8df styling class', () => {
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(getSavedTheme()).toBe('light');
  });

  it('falls back to dark when system preference matchMedia is dark', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('activates light theme when system prefers light mode', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(getSystemPrefersLight()).toBe(true);
    applyTheme('system');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
