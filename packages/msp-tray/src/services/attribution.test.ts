import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedAttribution, saveAttribution, clearAttribution } from './attribution';

const STORAGE_KEY = 'velmar_msp_tray_attribution';

describe('attribution service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is cached', () => {
    expect(getCachedAttribution()).toBeNull();
  });

  it('returns null when the cached value is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    expect(getCachedAttribution()).toBeNull();
  });

  it('persists and retrieves attribution with normalized identity', () => {
    const saved = saveAttribution('  Jane Doe ', ' JANE@EXAMPLE.COM ');
    expect(saved.reporterName).toBe('Jane Doe');
    expect(saved.reporterEmail).toBe('jane@example.com');

    const cached = getCachedAttribution();
    expect(cached).toEqual(saved);
    expect(cached?.rememberedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('round-trips an already normalized email unchanged', () => {
    saveAttribution('John Smith', 'john@acme.com');
    expect(getCachedAttribution()?.reporterEmail).toBe('john@acme.com');
  });

  it('clears the cached attribution', () => {
    saveAttribution('Jane Doe', 'jane@example.com');
    clearAttribution();
    expect(getCachedAttribution()).toBeNull();
  });

  it('overwrites a stale attribution record', () => {
    saveAttribution('Jane Doe', 'jane@example.com');
    const updated = saveAttribution('Ana Gómez', 'ana@example.com');
    expect(getCachedAttribution()).toEqual(updated);
    expect(getCachedAttribution()?.reporterName).toBe('Ana Gómez');
  });
});