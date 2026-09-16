export type TrayTheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'msp-tray-theme';

/**
 * Resolves the saved theme from localStorage, defaulting to 'system'.
 */
export function getSavedTheme(): TrayTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as TrayTheme | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return 'system';
}

/**
 * Detects whether the OS prefers light color scheme.
 */
export function getSystemPrefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

/**
 * Applies the given theme to the document element and persists preference.
 */
export function applyTheme(theme: TrayTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.classList.remove('light', 'dark');

  const isLight = theme === 'light' || (theme === 'system' && getSystemPrefersLight());
  if (isLight) {
    root.classList.add('light');
  } else {
    root.classList.add('dark');
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors in sandbox
  }
}

/**
 * Initializes the theme on application bootstrap and hooks system preference listeners.
 */
export function initTheme() {
  const current = getSavedTheme();
  applyTheme(current);

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    mediaQuery.addEventListener('change', () => {
      if (getSavedTheme() === 'system') {
        applyTheme('system');
      }
    });
  }
}
