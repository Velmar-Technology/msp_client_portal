import { usePageTitle } from "./usePageTitle";

/**
 * Renders nothing; applies the dynamic document title to the current route.
 */
export function DocumentTitle() {
  usePageTitle();
  return null;
}