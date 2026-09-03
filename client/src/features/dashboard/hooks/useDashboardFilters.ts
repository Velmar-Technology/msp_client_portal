import { useSearchParams } from 'react-router-dom';

/**
 * ADR-002: URL State Synchronization for Dashboard navigation & filtering.
 */
export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const setSearch = (newSearch: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newSearch) {
        next.set('search', newSearch);
      } else {
        next.delete('search');
      }
      next.set('page', '1');
      return next;
    });
  };

  const setPage = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  return {
    search,
    page,
    setSearch,
    setPage,
  };
}
