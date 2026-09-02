import { useState, useEffect, useCallback } from "react";
import {
  systemService,
  type SystemApiStatusResponse,
  type ApiStatusItem,
  type EnvVarStatusItem,
} from "@/services/systemService";
import { toast } from "sonner";

export function useApiStatus() {
  const [data, setData] = useState<SystemApiStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<"SERVICES" | "ENV_VARS">("SERVICES");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "OPERATIONAL" | "DEGRADED" | "DOWN">("ALL");
  const [envSearchQuery, setEnvSearchQuery] = useState("");
  const [envStatusTab, setEnvStatusTab] = useState<"ALL" | "CONFIGURED" | "DEFAULT_PLACEHOLDER" | "MISSING">("ALL");
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Pagination state for Services table
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesLimit, setServicesLimit] = useState(10);

  // Pagination state for Environment Variables table
  const [envVarsPage, setEnvVarsPage] = useState(1);
  const [envVarsLimit, setEnvVarsLimit] = useState(10);

  const fetchStatus = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    }
    try {
      const res = await systemService.getApiStatus();
      setData(res);
    } catch (err: unknown) {
      console.error("Failed to fetch API status", err);
      const message = err instanceof Error ? err.message : "Failed to load API system status";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchStatus]);

  // Reset pagination when search query or filter tab changes
  useEffect(() => {
    setServicesPage(1);
  }, [searchQuery, statusTab]);

  useEffect(() => {
    setEnvVarsPage(1);
  }, [envSearchQuery, envStatusTab]);

  // Derive filtered services during render (React 19 compiler-friendly)
  const filteredServices = data
    ? data.services.filter((item: ApiStatusItem) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTab = statusTab === "ALL" || item.status === statusTab;

        return matchesSearch && matchesTab;
      })
    : [];

  const servicesTotalPages = Math.ceil(filteredServices.length / servicesLimit) || 1;
  const startServices = (servicesPage - 1) * servicesLimit;
  const paginatedServices = filteredServices.slice(startServices, startServices + servicesLimit);

  // Derive filtered environment variables during render
  const filteredEnvVariables = data?.envVariables
    ? data.envVariables.filter((item: EnvVarStatusItem) => {
        const q = envSearchQuery.toLowerCase();
        const matchesSearch =
          item.key.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.valueDisplay.toLowerCase().includes(q);

        const matchesTab = envStatusTab === "ALL" || item.status === envStatusTab;

        return matchesSearch && matchesTab;
      })
    : [];

  const envVarsTotalPages = Math.ceil(filteredEnvVariables.length / envVarsLimit) || 1;
  const startEnv = (envVarsPage - 1) * envVarsLimit;
  const paginatedEnvVariables = filteredEnvVariables.slice(startEnv, startEnv + envVarsLimit);

  // Adjust page if filter/data change causes out-of-bounds page number
  useEffect(() => {
    if (servicesPage > servicesTotalPages && servicesTotalPages > 0) {
      setServicesPage(servicesTotalPages);
    }
  }, [servicesPage, servicesTotalPages]);

  useEffect(() => {
    if (envVarsPage > envVarsTotalPages && envVarsTotalPages > 0) {
      setEnvVarsPage(envVarsTotalPages);
    }
  }, [envVarsPage, envVarsTotalPages]);

  return {
    data,
    isLoading,
    isRefreshing,
    activeSection,
    setActiveSection,
    searchQuery,
    setSearchQuery,
    statusTab,
    setStatusTab,
    envSearchQuery,
    setEnvSearchQuery,
    envStatusTab,
    setEnvStatusTab,
    isAutoRefresh,
    setIsAutoRefresh,
    filteredServices,
    paginatedServices,
    servicesPage,
    setServicesPage,
    servicesLimit,
    setServicesLimit,
    servicesTotalPages,
    filteredEnvVariables,
    paginatedEnvVariables,
    envVarsPage,
    setEnvVarsPage,
    envVarsLimit,
    setEnvVarsLimit,
    envVarsTotalPages,
    refresh: () => fetchStatus(true),
  };
}

