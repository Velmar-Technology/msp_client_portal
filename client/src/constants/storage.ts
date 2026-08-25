/**
 * Storage Keys & Browser Cache Constants
 */

export const AUTH_STORAGE_KEYS = ["accessToken", "refreshToken", "user"] as const;

export const REMEMBER_ME_STORAGE_KEY = "rememberMe";

export const BELL_CLEARED_STORAGE_KEY = "msp_bell_cleared_at";

export const CHUNK_RELOAD_STORAGE_KEY = "msp_chunk_retry_reload_timestamp";
export const CHUNK_RELOAD_COOLDOWN_MS = 10000; // 10s cooldown to prevent reload loops

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
