/**
 * Thin abstraction over localStorage / sessionStorage.
 *
 * When "Remember Me" is checked, tokens persist in localStorage so the
 * session survives browser restarts.  When unchecked, tokens go into
 * sessionStorage and disappear when the tab closes.
 *
 * The choice is itself stored in localStorage (a tiny boolean flag) so
 * that on page reload we know which backing store to read from.
 */

import {
  REMEMBER_ME_STORAGE_KEY as REMEMBER_KEY,
  AUTH_STORAGE_KEYS as AUTH_KEYS,
} from "@/constants/storage";

type AuthKey = (typeof AUTH_KEYS)[number];


function isAuthKey(key: string): key is AuthKey {
  return (AUTH_KEYS as readonly string[]).includes(key);
}

/**
 * Returns true if the user previously chose "Remember Me".
 * Defaults to true for backward compatibility with existing sessions
 * that were stored in localStorage before this abstraction existed.
 */
export function getRememberMe(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(REMEMBER_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Persists the "Remember Me" preference.
 * Call this BEFORE storing tokens (i.e. at login time).
 */
export function setRememberMe(remember: boolean): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(REMEMBER_KEY, String(remember));
  } catch {
    // Ignore storage quota / access errors
  }
}

/** Returns the backing store for auth data based on the current preference. */
function getStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return getRememberMe() ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Read an auth value. Falls back across both stores so that a session
 * that was started before a preference change is still found.
 */
export function getAuthItem(key: AuthKey): string | null {
  if (typeof window === 'undefined') return null;
  const store = getStore();
  if (!store) return null;
  const value = store.getItem(key);
  if (value !== null) return value;

  // Fallback: check the other store (handles edge case where user
  // toggled preference mid-session, or legacy localStorage data)
  const fallbackStore = store === window.localStorage ? window.sessionStorage : window.localStorage;
  return fallbackStore ? fallbackStore.getItem(key) : null;
}

/** Write an auth value to the correct store. */
export function setAuthItem(key: AuthKey, value: string): void {
  if (typeof window === 'undefined') return;
  const store = getStore();
  if (!store) return;
  store.setItem(key, value);

  // Clean up the OTHER store to avoid stale duplicates
  const otherStore = store === window.localStorage ? window.sessionStorage : window.localStorage;
  if (otherStore) {
    otherStore.removeItem(key);
  }
}

/** Remove an auth value from BOTH stores (used during logout). */
export function removeAuthItem(key: AuthKey): void {
  if (typeof window === 'undefined') return;
  if (typeof window.localStorage !== 'undefined') window.localStorage.removeItem(key);
  if (typeof window.sessionStorage !== 'undefined') window.sessionStorage.removeItem(key);
}

/** Remove all auth data from both stores (full logout). */
export function clearAuthData(): void {
  for (const key of AUTH_KEYS) {
    removeAuthItem(key);
  }
  // Keep the rememberMe preference — it's a UX choice, not session data
}

/**
 * Utility to check if any string key is an auth key and retrieve it.
 * Useful for non-auth-aware code that previously called localStorage directly.
 */
export function getAuthItemIfAuthKey(key: string): string | null {
  return isAuthKey(key) ? getAuthItem(key) : null;
}
