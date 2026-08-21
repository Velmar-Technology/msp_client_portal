import React, { type ComponentType } from "react";

export type ComponentImportFactory<T = ComponentType<any>> = () => Promise<{ default: T }>;

export interface LazyWithRetryOptions {
  /**
   * Maximum retry attempts before giving up or triggering fallback.
   * @default 2
   */
  maxRetries?: number;
  /**
   * Base delay (in ms) for exponential backoff between retries.
   * @default 300
   */
  initialDelayMs?: number;
  /**
   * Whether to perform an automated single page reload on chunk load failure.
   * Useful when new deployments change asset hashes.
   * @default true
   */
  autoReloadOnDeployMismatch?: boolean;
}

export type PreloadableComponent<T = ComponentType<any>> = React.LazyExoticComponent<ComponentType<any>> & {
  preload: () => Promise<{ default: T }>;
};

const CHUNK_RELOAD_STORAGE_KEY = "msp_chunk_retry_reload_timestamp";
const CHUNK_RELOAD_COOLDOWN_MS = 10000; // 10s cooldown to prevent reload loops

/**
 * Checks if a chunk load error is likely caused by a stale deployment / missing asset hash.
 */
function isChunkLoadingError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError")
  );
}

/**
 * Attempts a graceful, rate-limited page reload when a new deployment invalidates chunk hashes.
 */
function attemptDeploymentMismatchReload(): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }

  try {
    const lastReloadStr = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    const now = Date.now();

    if (lastReloadStr) {
      const lastReload = parseInt(lastReloadStr, 10);
      if (now - lastReload < CHUNK_RELOAD_COOLDOWN_MS) {
        // Already reloaded recently, avoid reload loop
        return false;
      }
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, now.toString());
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes a dynamic import factory with exponential backoff retries.
 */
async function executeWithRetry<T>(
  factory: ComponentImportFactory<T>,
  options: LazyWithRetryOptions = {}
): Promise<{ default: T }> {
  const {
    maxRetries = 2,
    initialDelayMs = 300,
    autoReloadOnDeployMismatch = true,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await factory();
    } catch (error) {
      attempt++;

      if (attempt > maxRetries) {
        // If chunk failed and reload is enabled, try a one-time deployment reload
        if (autoReloadOnDeployMismatch && isChunkLoadingError(error)) {
          const reloaded = attemptDeploymentMismatchReload();
          if (reloaded) {
            // Return an unresolved promise to halt rendering while page reloads
            return new Promise(() => {});
          }
        }
        throw error;
      }

      // Exponential backoff: initialDelayMs * 2^(attempt - 1)
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Enterprise-grade wrapper for `React.lazy()` providing:
 * 1. Automatic exponential backoff retries on network/chunk load errors.
 * 2. Session-guarded reload fallback on deployment version mismatches.
 * 3. Attach `.preload()` method for intent-based and idle preloading.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: ComponentImportFactory<T>,
  options: LazyWithRetryOptions = {}
): PreloadableComponent<T> {
  let cachedPromise: Promise<{ default: T }> | null = null;

  const loadModule = (): Promise<{ default: T }> => {
    if (!cachedPromise) {
      cachedPromise = executeWithRetry(factory, options).catch((err) => {
        // Clear cached promise on error so subsequent retries can re-attempt
        cachedPromise = null;
        throw err;
      });
    }
    return cachedPromise;
  };

  const LazyComponent = React.lazy(loadModule) as unknown as PreloadableComponent<T>;

  LazyComponent.preload = loadModule;

  return LazyComponent;
}

/**
 * Preloads a list of dynamic module factories during browser idle time using `requestIdleCallback`.
 * Falls back to `setTimeout` for browsers without native `requestIdleCallback` support.
 */
export function preloadOnIdle(
  preloaders: Array<() => Promise<unknown>>,
  timeoutMs = 2000
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let cancelled = false;

  const runPreload = () => {
    if (cancelled) return;
    preloaders.forEach((preload) => {
      try {
        preload().catch(() => {
          // Swallow background preload errors quietly
        });
      } catch {
        // Ignore synchronous errors
      }
    });
  };

  if ("requestIdleCallback" in window) {
    const handle = (window as any).requestIdleCallback(runPreload, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      (window as any).cancelIdleCallback?.(handle);
    };
  }

  const timer = setTimeout(runPreload, 200);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
