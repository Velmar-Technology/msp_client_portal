import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeferredLoading } from './useDeferredLoading';
import { SKELETON_DISPLAY_DELAY_MS } from '@/constants/ui';

describe('useDeferredLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false initially when isLoading is true (within delay threshold)', () => {
    const { result } = renderHook(() => useDeferredLoading(true));
    expect(result.current).toBe(false);
  });

  it('returns true after SKELETON_DISPLAY_DELAY_MS when isLoading remains true', () => {
    const { result } = renderHook(() => useDeferredLoading(true));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SKELETON_DISPLAY_DELAY_MS);
    });

    expect(result.current).toBe(true);
  });

  it('does not show skeleton if loading finishes before threshold (prevents flicker)', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDeferredLoading(loading),
      { initialProps: { loading: true } }
    );

    expect(result.current).toBe(false);

    // Advance halfway through the threshold
    act(() => {
      vi.advanceTimersByTime(SKELETON_DISPLAY_DELAY_MS / 2);
    });

    // Loading finishes fast
    rerender({ loading: false });

    // Advance past original threshold
    act(() => {
      vi.advanceTimersByTime(SKELETON_DISPLAY_DELAY_MS);
    });

    expect(result.current).toBe(false);
  });

  it('supports custom delay threshold', () => {
    const customDelay = 300;
    const { result } = renderHook(() => useDeferredLoading(true, customDelay));

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(true);
  });
});
