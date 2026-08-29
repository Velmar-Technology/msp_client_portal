import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface SetUrlParamsOptions {
  replace?: boolean;
}

/**
 * Type-safe custom hook for reading, writing, and synchronizing React Router URL search parameters.
 * Facilitates URL state synchronization for active tabs, filter query parameters, search inputs, and open modals.
 *
 * @returns Object providing utility getters and setters (`getParam`, `getNumberParam`, `setParam`, `setParams`, `removeParam`, `removeParams`, `queryParams`).
 */
export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback(
    (key: string, defaultValue: string = ""): string => {
      return searchParams.get(key) ?? defaultValue;
    },
    [searchParams]
  );

  const getNumberParam = useCallback(
    (key: string, defaultValue: number): number => {
      const val = searchParams.get(key);
      if (!val) return defaultValue;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    },
    [searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | number | boolean | null | undefined, options?: SetUrlParamsOptions) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === undefined || value === "") {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          return next;
        },
        { replace: options?.replace ?? true }
      );
    },
    [setSearchParams]
  );

  const setParams = useCallback(
    (params: Record<string, string | number | boolean | null | undefined>, options?: SetUrlParamsOptions) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace: options?.replace ?? true }
      );
    },
    [setSearchParams]
  );

  const removeParam = useCallback(
    (key: string, options?: SetUrlParamsOptions) => {
      setParam(key, null, options);
    },
    [setParam]
  );

  const removeParams = useCallback(
    (keys: string[], options?: SetUrlParamsOptions) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          keys.forEach((key) => next.delete(key));
          return next;
        },
        { replace: options?.replace ?? true }
      );
    },
    [setSearchParams]
  );

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  return {
    searchParams,
    queryParams,
    getParam,
    getNumberParam,
    setParam,
    setParams,
    removeParam,
    removeParams,
  };
}
