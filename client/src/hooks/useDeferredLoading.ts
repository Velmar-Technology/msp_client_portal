import { useState, useEffect } from 'react';
import { SKELETON_DISPLAY_DELAY_MS } from '@/constants/ui';

/**
 * Delays displaying skeleton loading states to prevent jarring visual flickering ("skeleton flash")
 * when API calls complete within a few milliseconds.
 *
 * @param isLoading - Whether the underlying resource is currently loading.
 * @param delayMs - Delay in milliseconds before setting the display state to true. Defaults to SKELETON_DISPLAY_DELAY_MS (180ms).
 * @returns boolean - Whether the skeleton should be rendered.
 */
export function useDeferredLoading(
  isLoading: boolean,
  delayMs: number = SKELETON_DISPLAY_DELAY_MS
): boolean {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSkeleton(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return showSkeleton;
}
