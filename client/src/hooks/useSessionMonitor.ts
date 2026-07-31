import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { getAuthItem } from '@/lib/authStorage';

/**
 * Decodes a JWT payload without external dependencies.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Calculates milliseconds until a JWT access token expires.
 * Returns null if the token is missing, malformed, or has no `exp` claim.
 * Returns 0 if already expired.
 */
function msUntilExpiry(token: string | null): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  const remaining = payload.exp * 1000 - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Global hook that monitors session health and triggers logout when the
 * access token expires and cannot be refreshed.
 *
 * Two mechanisms work together:
 *
 * 1. **Proactive timer** — Decodes the JWT `exp` claim and schedules a
 *    logout slightly before it expires (with a 30-second buffer to allow
 *    a silent refresh attempt). If the refresh also fails, the Axios
 *    interceptor clears storage and redirects.
 *
 * 2. **Reactive event listener** — Listens for the `auth:unauthorized`
 *    custom event dispatched by `setupAxiosErrorInterceptor` whenever a
 *    401 response is received and refresh has already failed. This covers
 *    cases where the token expires between timer checks.
 *
 * Mount this hook once at the app root (inside `<BrowserRouter>`).
 */
export function useSessionMonitor(): void {
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSessionExpired = useCallback(() => {
    // Only act if still authenticated in state — avoids duplicate toasts
    const currentState = useAuthStore.getState();
    if (!currentState.isAuthenticated) return;

    toast.error('Your session has expired. Please log in again.', { duration: 5000 });
    logout();
  }, [logout]);

  // --- Mechanism 1: Proactive expiry timer ---
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any leftover timer when logged out
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    function scheduleExpiryCheck() {
      if (timerRef.current) clearTimeout(timerRef.current);

      const token = getAuthItem('accessToken');
      const remaining = msUntilExpiry(token);

      if (remaining === null) return; // No valid token to monitor

      if (remaining === 0) {
        // Already expired — log out immediately
        handleSessionExpired();
        return;
      }

      // Schedule the check 30 seconds before actual expiry.
      // The Axios interceptor will attempt a silent refresh first;
      // if that fails, the `auth:unauthorized` event fires and we log out.
      const buffer = Math.min(30_000, remaining);
      const delay = remaining - buffer;

      timerRef.current = setTimeout(() => {
        const freshToken = getAuthItem('accessToken');
        const freshRemaining = msUntilExpiry(freshToken);

        if (freshRemaining === null || freshRemaining === 0) {
          handleSessionExpired();
        } else {
          // Token was refreshed by the interceptor — reschedule
          scheduleExpiryCheck();
        }
      }, Math.max(delay, 1000)); // minimum 1s to avoid tight loops
    }

    scheduleExpiryCheck();

    // Re-check whenever the access token changes in localStorage
    // (e.g. after a silent refresh by the Axios interceptor)
    function onStorageChange(e: StorageEvent) {
      if (e.key === 'accessToken') {
        scheduleExpiryCheck();
      }
    }

    window.addEventListener('storage', onStorageChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [isAuthenticated, handleSessionExpired]);

  // --- Mechanism 2: Reactive unauthorized event listener ---
  useEffect(() => {
    if (!isAuthenticated) return;

    function onUnauthorized() {
      handleSessionExpired();
    }

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [isAuthenticated, handleSessionExpired]);
}
