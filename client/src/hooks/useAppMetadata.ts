import { APP_METADATA, type AppMetadata } from "@/config/metadata";

/**
 * Hook to access central application metadata variables.
 */
export function useAppMetadata(): AppMetadata {
  return APP_METADATA;
}
