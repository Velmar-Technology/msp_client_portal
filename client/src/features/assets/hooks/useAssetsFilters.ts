import { useSearchParams } from 'react-router-dom';
import type { AssetType, AssetStatus } from '@shared/contracts';

/**
 * URL State Synchronization for Assets navigation & filtering.
 */
export function useAssetsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const type = (searchParams.get('type') as AssetType) || undefined;
  const status = (searchParams.get('status') as AssetStatus) || undefined;

  const setSearch = (newSearch: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newSearch) {
        next.set('search', newSearch);
      } else {
        next.delete('search');
      }
      return next;
    });
  };

  const setType = (newType: AssetType | 'ALL') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newType && newType !== 'ALL') {
        next.set('type', newType);
      } else {
        next.delete('type');
      }
      return next;
    });
  };

  const setStatus = (newStatus: AssetStatus | 'ALL') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newStatus && newStatus !== 'ALL') {
        next.set('status', newStatus);
      } else {
        next.delete('status');
      }
      return next;
    });
  };

  return {
    search,
    type,
    status,
    setSearch,
    setType,
    setStatus,
  };
}
