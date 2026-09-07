export interface ShiftWorkerAttribution {
  reporterName: string;
  reporterEmail: string;
  rememberedAt: string;
}

const STORAGE_KEY = 'velmar_msp_tray_attribution';

/**
 * Retrieves the cached shift-worker identity from local storage.
 * @returns {ShiftWorkerAttribution | null} The cached identity or null if not yet configured
 */
export function getCachedAttribution(): ShiftWorkerAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ShiftWorkerAttribution;
  } catch {
    return null;
  }
}

/**
 * Persists the shift-worker name and work email locally.
 * @param {string} name - Worker's full name
 * @param {string} email - Worker's work email address
 * @returns {ShiftWorkerAttribution} The persisted attribution record
 */
export function saveAttribution(name: string, email: string): ShiftWorkerAttribution {
  const attribution: ShiftWorkerAttribution = {
    reporterName: name.trim(),
    reporterEmail: email.trim().toLowerCase(),
    rememberedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch (err) {
    console.error('Failed to save attribution to localStorage', err);
  }
  return attribution;
}

/**
 * Clears the cached shift-worker identity from local storage.
 */
export function clearAttribution(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear attribution', err);
  }
}
