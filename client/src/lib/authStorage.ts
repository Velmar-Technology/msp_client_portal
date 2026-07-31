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

const REMEMBER_KEY = 'rememberMe';

/** Auth keys that should be routed through this abstraction. */
const AUTH_KEYS = ['accessToken', 'refreshToken', 'user'] as const;
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
  return localStorage.getItem(REMEMBER_KEY) !== 'false';
}

/**
 * Persists the "Remember Me" preference.
 * Call this BEFORE storing tokens (i.e. at login time).
 */
export function setRememberMe(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, String(remember));
}

/** Returns the backing store for auth data based on the current preference. */
function getStore(): Storage {
  return getRememberMe() ? localStorage : sessionStorage;
}

/**
 * Read an auth value. Falls back across both stores so that a session
 * that was started before a preference change is still found.
 */
export function getAuthItem(key: AuthKey): string | null {
  const store = getStore();
  const value = store.getItem(key);
  if (value !== null) return value;

  // Fallback: check the other store (handles edge case where user
  // toggled preference mid-session, or legacy localStorage data)
  const fallbackStore = store === localStorage ? sessionStorage : localStorage;
  return fallbackStore.getItem(key);
}

/** Write an auth value to the correct store. */
export function setAuthItem(key: AuthKey, value: string): void {
  const store = getStore();
  store.setItem(key, value);

  // Clean up the OTHER store to avoid stale duplicates
  const otherStore = store === localStorage ? sessionStorage : localStorage;
  otherStore.removeItem(key);
}

/** Remove an auth value from BOTH stores (used during logout). */
export function removeAuthItem(key: AuthKey): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
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
