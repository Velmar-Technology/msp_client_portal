import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";

export interface TenantSummary {
  id: string;
  name: string;
  subdomain?: string | null;
  account_status?: string;
  created_at?: string;
}

export const TENANT_QUERY_KEYS = {
  all: ["tenants"] as const,
  list: () => [...TENANT_QUERY_KEYS.all, "list"] as const,
};

/**
 * Fetches the directory of all registered tenant organizations.
 *
 * @returns Array of tenant summaries
 */
export async function fetchTenants(): Promise<TenantSummary[]> {
  const { data } = await api.get<{ success: boolean; data: TenantSummary[] }>("/tenants");
  return data.data;
}

/**
 * React Query hook retrieving registered tenant organizations.
 * Enabled exclusively for users with ADMIN or TECHNICIAN privileges.
 */
export function useTenants() {
  const user = useAuthStore((s) => s.user);
  const isElevated = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  return useQuery({
    queryKey: TENANT_QUERY_KEYS.list(),
    queryFn: fetchTenants,
    enabled: !!user && isElevated,
    staleTime: 5 * 60 * 1000,
  });
}
