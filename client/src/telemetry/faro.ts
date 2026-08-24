import {
  initializeFaro as initFaroSdk,
  getWebInstrumentations,
  ReactIntegration,
  faro,
  type Faro,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

let faroInstance: Faro | null = null;

export interface FaroUserContext {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  tenantId?: string;
}

/**
 * Initializes the Grafana Faro Web SDK for Frontend Real User Monitoring (RUM).
 * Captures Core Web Vitals, unhandled JavaScript exceptions, console errors, and tracing.
 */
export function initFaro(): Faro | null {
  if (faroInstance) {
    return faroInstance;
  }

  // Prevent multiple initializations in SSR or test environments if window is absent
  if (typeof window === 'undefined') {
    return null;
  }

  const collectorUrl = import.meta.env.VITE_FARO_URL;
  const appName = import.meta.env.VITE_FARO_APP_NAME || 'msp-client-portal';
  const appEnv = import.meta.env.VITE_FARO_APP_ENV || import.meta.env.MODE || 'production';
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.5.2';

  try {
    // If no collector URL is provided (e.g. offline local development),
    // we initialize Faro with an optional or console fallback if supported,
    // or initialize with the provided URL.
    if (collectorUrl) {
      faroInstance = initFaroSdk({
        url: collectorUrl,
        app: {
          name: appName,
          version: appVersion,
          environment: appEnv,
        },
        instrumentations: [
          ...getWebInstrumentations({
            captureConsole: true,
          }),
          new TracingInstrumentation(),
          new ReactIntegration(),
        ],
      });
    } else {
      // Local fallback mode when VITE_FARO_URL is not set
      if (import.meta.env.DEV) {
        console.info(
          '[Faro RUM] VITE_FARO_URL is not configured. Telemetry collection is operating in stand-by mode.'
        );
      }
    }
  } catch (err) {
    console.warn('[Faro RUM] Failed to initialize Grafana Faro:', err);
  }

  return faroInstance;
}

/**
 * Sets authenticated user context on the active Faro session.
 */
export function setFaroUser(user: FaroUserContext | null | undefined): void {
  if (!user || !faro.api) return;

  try {
    faro.api.setUser({
      id: user.id || user.email || 'anonymous',
      email: user.email,
      username: user.username || user.email,
      attributes: {
        ...(user.role ? { role: user.role } : {}),
        ...(user.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Faro RUM] Failed to set user context:', err);
    }
  }
}

/**
 * Clears user context from Faro on logout.
 */
export function resetFaroUser(): void {
  if (!faro.api) return;
  try {
    faro.api.resetUser();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Faro RUM] Failed to reset user context:', err);
    }
  }
}

/**
 * Tracks failed HTTP API responses (4xx, 5xx, network drops) as structured Faro events.
 */
export function trackApiError(error: any): void {
  if (!faro.api) return;

  try {
    const status = error?.response?.status || 'NETWORK_ERROR';
    const method = error?.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error?.config?.url || 'UNKNOWN';
    const message =
      error?.response?.data?.message || error?.message || 'API request failed';

    // Push structured event to Faro
    faro.api.pushEvent('http_request_error', {
      status: String(status),
      method,
      url,
      message,
    });

    // Also push 5xx server errors as tracked application errors
    if (typeof status === 'number' && status >= 500) {
      faro.api.pushError(
        new Error(`[API ${status}] ${method} ${url}: ${message}`)
      );
    }
  } catch {
    // Fail silently to avoid breaking application execution
  }
}

/**
 * Tracks custom domain events (e.g. ticket creation, invoice payment).
 */
export function trackFaroEvent(name: string, attributes?: Record<string, string>): void {
  if (!faro.api) return;
  try {
    faro.api.pushEvent(name, attributes);
  } catch {
    // Fail silently
  }
}

export { faro };
