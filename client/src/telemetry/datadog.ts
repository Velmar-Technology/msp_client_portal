import { datadogRum } from '@datadog/browser-rum';

let isDatadogInitialized = false;

export interface DatadogUserContext {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  tenantId?: string;
}

/**
 * Initializes Datadog Real User Monitoring (RUM) & Visual Session Replay.
 * Captures Core Web Vitals, user interactions, video-like session replays, and distributed APM tracing headers.
 */
export function initDatadogRum(): boolean {
  if (isDatadogInitialized) {
    return true;
  }

  // Prevent multiple initializations in SSR or test environments if window is absent
  if (typeof window === 'undefined') {
    return false;
  }

  const applicationId = import.meta.env.VITE_DD_APPLICATION_ID;
  const clientToken = import.meta.env.VITE_DD_CLIENT_TOKEN;
  const site = import.meta.env.VITE_DD_SITE || 'datadoghq.com';
  const service = import.meta.env.VITE_DD_SERVICE || 'msp-client-portal';
  const env = import.meta.env.VITE_DD_ENV || import.meta.env.MODE || 'production';
  const version = import.meta.env.VITE_APP_VERSION || '1.5.2';

  // If credentials are not provided (e.g. offline development or tests), operate in standby mode
  if (!applicationId || !clientToken) {
    if (import.meta.env.DEV) {
      console.info(
        '[Datadog RUM] VITE_DD_APPLICATION_ID or VITE_DD_CLIENT_TOKEN is not configured. Datadog RUM is in standby mode.'
      );
    }
    return false;
  }

  try {
    datadogRum.init({
      applicationId,
      clientToken,
      site,
      service,
      env,
      version,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
      allowedTracingUrls: [
        (url: string) =>
          url.startsWith(window.location.origin) ||
          url.includes('/api/v1') ||
          url.includes('helpdesk.velmartech.com.do'),
      ],
    });

    // Start visual session replay recording
    datadogRum.startSessionReplayRecording();
    isDatadogInitialized = true;

    if (import.meta.env.DEV) {
      console.info('[Datadog RUM] Initialized successfully with Visual Session Replay & APM Tracing.');
    }
    return true;
  } catch (err) {
    console.warn('[Datadog RUM] Failed to initialize Datadog RUM:', err);
    return false;
  }
}

/**
 * Sets authenticated user context on the active Datadog RUM session.
 */
export function setDatadogUser(user: DatadogUserContext | null | undefined): void {
  if (!user) return;

  try {
    datadogRum.setUser({
      id: user.id || user.email || 'anonymous',
      email: user.email,
      name: user.username || user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Datadog RUM] Failed to set user context:', err);
    }
  }
}

/**
 * Clears user context from Datadog on logout.
 */
export function resetDatadogUser(): void {
  try {
    datadogRum.clearUser();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Datadog RUM] Failed to clear user context:', err);
    }
  }
}

/**
 * Tracks custom application errors in Datadog RUM.
 */
export function trackDatadogError(error: unknown, context?: Record<string, unknown>): void {
  try {
    if (error instanceof Error) {
      datadogRum.addError(error, context);
    } else {
      datadogRum.addError(new Error(String(error)), context);
    }
  } catch {
    // Fail silently to prevent runtime disruption
  }
}

/**
 * Tracks custom user actions and domain events in Datadog RUM.
 */
export function trackDatadogAction(name: string, context?: Record<string, unknown>): void {
  try {
    datadogRum.addAction(name, context);
  } catch {
    // Fail silently
  }
}

export { datadogRum };
