import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Server,
  Clock,
  KeyRound,
  Lock,
  FileCode,
  Shield,
  Info,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useApiStatus } from "../hooks/useApiStatus";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ApiStatusItem, EnvVarStatusItem } from "../api/systemService";

/**
 * System & API Health Status Page.
 * Styled with the ElevenLabs Request Log / Health monitoring pattern featuring
 * standalone bubble tabs, wide search input with CSV export, filter pills,
 * latency health distribution telemetry, and unified content cards.
 */
export function ApiStatusPage() {
  const { t } = useTranslation();
  const {
    data,
    isLoading,
    isRefreshing,
    activeSection,
    setActiveSection,
    searchQuery,
    setSearchQuery,
    statusTab,
    setStatusTab,
    categoryFilter,
    setCategoryFilter,
    latencyFilter,
    setLatencyFilter,
    envSearchQuery,
    setEnvSearchQuery,
    envStatusTab,
    setEnvStatusTab,
    envCategoryFilter,
    setEnvCategoryFilter,
    envSensitivityFilter,
    setEnvSensitivityFilter,
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
    refresh,
  } = useApiStatus();

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "CORE":
        return t("apiStatus.categoryCore", "Core");
      case "SERVICES":
        return t("apiStatus.categoryServices", "Services");
      case "BUSINESS":
        return t("apiStatus.categoryBusiness", "Business");
      case "INTEGRATION":
        return t("apiStatus.categoryIntegration", "Integration");
      default:
        return category;
    }
  };

  const getEnvCategoryLabel = (category: string) => {
    switch (category) {
      case "DATABASE":
        return t("apiStatus.envCategoryDatabase", "Database");
      case "SERVER":
        return t("apiStatus.envCategoryServer", "Server");
      case "SECURITY":
        return t("apiStatus.envCategorySecurity", "Security");
      case "EMAIL":
        return t("apiStatus.envCategoryEmail", "Email");
      case "WHATSAPP":
        return t("apiStatus.envCategoryWhatsapp", "WhatsApp");
      case "UPLOADS":
        return t("apiStatus.envCategoryUploads", "Uploads");
      case "OAUTH":
        return t("apiStatus.envCategoryOauth", "OAuth");
      case "STORAGE":
        return t("apiStatus.envCategoryStorage", "Storage");
      case "PAYPAL":
        return t("apiStatus.envCategoryPaypal", "PayPal");
      case "RMM":
        return t("apiStatus.envCategoryRmm", "RMM");
      default:
        return category;
    }
  };

  const getStatusBadge = (status: "OPERATIONAL" | "DEGRADED" | "DOWN") => {
    switch (status) {
      case "OPERATIONAL":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-semibold gap-1 text-[10px] uppercase tracking-wider rounded-full px-2"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {t("apiStatus.statusOperational", "Operational")}
          </Badge>
        );
      case "DEGRADED":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 font-semibold gap-1 text-[10px] uppercase tracking-wider rounded-full px-2"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            {t("apiStatus.statusDegraded", "Degraded")}
          </Badge>
        );
      case "DOWN":
        return (
          <Badge
            variant="outline"
            className="border-red-500/40 dark:border-red-500/50 text-red-600 dark:text-red-400 font-semibold gap-1 text-[10px] uppercase tracking-wider rounded-full px-2"
          >
            <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
            {t("apiStatus.statusDown", "Down")}
          </Badge>
        );
    }
  };

  const getEnvStatusBadge = (status: "CONFIGURED" | "DEFAULT_PLACEHOLDER" | "MISSING") => {
    switch (status) {
      case "CONFIGURED":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-semibold gap-1 text-[10px] uppercase tracking-wider rounded-full px-2"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {t("apiStatus.statusConfigured", "Configured")}
          </Badge>
        );
      case "DEFAULT_PLACEHOLDER":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 dark:border-amber-500/50 text-amber-600 dark:text-amber-400 font-semibold gap-1 text-[10px] uppercase tracking-wider rounded-full px-2"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            {t("apiStatus.statusPlaceholder", "Placeholder")}
          </Badge>
        );
      case "MISSING":
        return (
          <Badge
            variant="outline"
            className="border-red-500/40 dark:border-red-500/50 text-red-600 dark:text-red-400 font-semibold gap-1 text-[10px] uppercase tracking-wider rounded-full px-2"
          >
            <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
            {t("apiStatus.statusMissing", "Missing")}
          </Badge>
        );
    }
  };

  // 1. Column Definitions for API Microservices Table
  const serviceColumns = useMemo<ColumnDef<ApiStatusItem, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableServiceName", "Service")} />,
        cell: ({ row }) => {
          const service = row.original;
          return (
            <div className="flex items-center gap-2 font-medium text-xs text-foreground">
              <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold">{service.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableCategory", "Category")} />,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
          >
            {getCategoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: "endpoint",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEndpoint", "Endpoint")} />,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
            {row.original.endpoint}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableStatus", "Status")} />,
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "latencyMs",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableLatency", "Latency")} />,
        cell: ({ row }) => {
          const latencyMs = row.original.latencyMs;
          return (
            <span
              className={cn(
                "font-mono text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center",
                latencyMs < 50
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                  : latencyMs < 200
                    ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                    : "text-red-700 dark:text-red-400 bg-red-500/10",
              )}
            >
              {latencyMs} {t("apiStatus.unitMs", "ms")}
            </span>
          );
        },
      },
      {
        accessorKey: "uptimePercentage",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableUptime", "Uptime")} />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground font-medium">
            {row.original.uptimePercentage}
            {t("apiStatus.unitPercent", "%")}
          </span>
        ),
      },
    ],
    [t],
  );

  // 2. Column Definitions for Environment Variables Table
  const envVarColumns = useMemo<ColumnDef<EnvVarStatusItem, any>[]>(
    () => [
      {
        accessorKey: "key",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvKey", "Variable")} />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2 font-medium text-xs text-foreground">
              {item.isSecret ? (
                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              ) : (
                <FileCode className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
              <span className="font-mono text-[12px] font-semibold">{item.key}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvCategory", "Category")} />,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
          >
            {getEnvCategoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvStatus", "Status")} />,
        cell: ({ row }) => getEnvStatusBadge(row.original.status),
      },
      {
        accessorKey: "valueDisplay",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvValue", "Current Value")} />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={cn(
                  "px-2 py-0.5 rounded font-mono",
                  item.isSecret
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    : "bg-muted text-foreground border border-border/50",
                )}
              >
                {item.valueDisplay}
              </span>
              {item.isSecret ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Shield className="h-3.5 w-3.5 text-amber-500 cursor-help opacity-80" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">{t("apiStatus.secretMaskedTooltip", "Sensitive credential is encrypted and masked")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">{t("apiStatus.publicValueTooltip", "Public configuration variable")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvDescription", "Description")} />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground max-w-sm block leading-relaxed">{row.original.description}</span>
        ),
      },
    ],
    [t],
  );

  // Filter options for Services
  const serviceStatusOptions = useMemo(
    () => [
      { value: "OPERATIONAL", label: t("apiStatus.statusOperational", "Operational") },
      { value: "DEGRADED", label: t("apiStatus.statusDegraded", "Degraded") },
      { value: "DOWN", label: t("apiStatus.statusDown", "Down") },
    ],
    [t],
  );

  const serviceCategoryOptions = useMemo(
    () => [
      { value: "CORE", label: t("apiStatus.categoryCore", "Core") },
      { value: "SERVICES", label: t("apiStatus.categoryServices", "Services") },
      { value: "BUSINESS", label: t("apiStatus.categoryBusiness", "Business") },
      { value: "INTEGRATION", label: t("apiStatus.categoryIntegration", "Integration") },
    ],
    [t],
  );

  const latencyOptions = useMemo(
    () => [
      { value: "FAST", label: "< 50ms (Optimal)" },
      { value: "NORMAL", label: "50-200ms (Normal)" },
      { value: "SLOW", label: "> 200ms (Degraded)" },
    ],
    [],
  );

  // Filter options for Env Vars
  const envStatusOptions = useMemo(
    () => [
      { value: "CONFIGURED", label: t("apiStatus.statusConfigured", "Configured") },
      { value: "DEFAULT_PLACEHOLDER", label: t("apiStatus.statusPlaceholder", "Placeholder") },
      { value: "MISSING", label: t("apiStatus.statusMissing", "Missing") },
    ],
    [t],
  );

  const envCategoryOptions = useMemo(
    () => [
      { value: "DATABASE", label: t("apiStatus.envCategoryDatabase", "Database") },
      { value: "SERVER", label: t("apiStatus.envCategoryServer", "Server") },
      { value: "SECURITY", label: t("apiStatus.envCategorySecurity", "Security") },
      { value: "EMAIL", label: t("apiStatus.envCategoryEmail", "Email") },
      { value: "WHATSAPP", label: t("apiStatus.envCategoryWhatsapp", "WhatsApp") },
      { value: "UPLOADS", label: t("apiStatus.envCategoryUploads", "Uploads") },
      { value: "OAUTH", label: t("apiStatus.envCategoryOauth", "OAuth") },
      { value: "STORAGE", label: t("apiStatus.envCategoryStorage", "Storage") },
      { value: "PAYPAL", label: t("apiStatus.envCategoryPaypal", "PayPal") },
      { value: "RMM", label: t("apiStatus.envCategoryRmm", "RMM") },
    ],
    [t],
  );

  const sensitivityOptions = useMemo(
    () => [
      { value: "SECRET", label: t("apiStatus.secretOnly", "Secret / Masked") },
      { value: "PUBLIC", label: t("apiStatus.publicOnly", "Public / Exposed") },
    ],
    [t],
  );

  // Clear filter helpers
  const hasActiveServiceFilters = Boolean(
    searchQuery ||
    (statusTab && statusTab !== "ALL") ||
    (categoryFilter && categoryFilter !== "ALL") ||
    (latencyFilter && latencyFilter !== "ALL")
  );

  const handleClearServiceFilters = useCallback(() => {
    setSearchQuery("");
    setStatusTab("ALL");
    setCategoryFilter("ALL");
    setLatencyFilter("ALL");
  }, [setSearchQuery, setStatusTab, setCategoryFilter, setLatencyFilter]);

  const hasActiveEnvFilters = Boolean(
    envSearchQuery ||
    (envStatusTab && envStatusTab !== "ALL") ||
    (envCategoryFilter && envCategoryFilter !== "ALL") ||
    (envSensitivityFilter && envSensitivityFilter !== "ALL")
  );

  const handleClearEnvFilters = useCallback(() => {
    setEnvSearchQuery("");
    setEnvStatusTab("ALL");
    setEnvCategoryFilter("ALL");
    setEnvSensitivityFilter("ALL");
  }, [setEnvSearchQuery, setEnvStatusTab, setEnvCategoryFilter, setEnvSensitivityFilter]);

  // Export CSV handler
  const handleExportCSV = useCallback(() => {
    if (activeSection === "SERVICES") {
      const headers = ["Name", "Category", "Endpoint", "Status", "Latency (ms)", "Uptime (%)"];
      const rows = filteredServices.map((s) => [
        `"${s.name}"`,
        `"${s.category}"`,
        `"${s.endpoint}"`,
        `"${s.status}"`,
        s.latencyMs,
        s.uptimePercentage,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `api-services-health-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("apiStatus.exportServicesSuccess", "Services exported successfully"));
    } else {
      const headers = ["Variable", "Category", "Status", "Description", "Sensitivity"];
      const rows = filteredEnvVariables.map((v) => [
        `"${v.key}"`,
        `"${v.category}"`,
        `"${v.status}"`,
        `"${v.description}"`,
        v.isSecret ? "Secret" : "Public",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `env-variables-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("apiStatus.exportEnvSuccess", "Environment variables exported successfully"));
    }
  }, [activeSection, filteredServices, filteredEnvVariables, t]);

  // Latency health distribution data
  const latencyHistogramData = useMemo(() => {
    if (!data?.services) return [];
    const under50 = data.services.filter((s) => s.latencyMs < 50).length;
    const between50and200 = data.services.filter((s) => s.latencyMs >= 50 && s.latencyMs <= 200).length;
    const over200 = data.services.filter((s) => s.latencyMs > 200).length;

    return [
      { label: "< 50ms (Optimal)", value: under50, color: "hsl(142.1 76.2% 36.3%)" },
      { label: "50-200ms (Normal)", value: between50and200, color: "hsl(38 92% 50%)" },
      { label: "> 200ms (Degraded)", value: over200, color: "hsl(346.8 77.2% 49.8%)" },
    ];
  }, [data?.services]);

  return (
    <Page isLoading={isLoading}>
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title docsUrl="https://help.velmar.com/api-status">{t("apiStatus.title", "System & API Health Status")}</Page.Title>
            <Page.Description>{t("apiStatus.subtitle", "Real-time microservices latency, uptime, and environment audit")}</Page.Description>
          </Page.TitleGroup>
          <Page.Actions maxVisible={3}>
            <div className="flex items-center space-x-2 mr-1">
              <Checkbox
                id="auto-refresh"
                checked={isAutoRefresh}
                onCheckedChange={(checked) => setIsAutoRefresh(!!checked)}
              />
              <Label
                htmlFor="auto-refresh"
                className="text-xs text-muted-foreground cursor-pointer font-medium select-none"
              >
                {t("apiStatus.autoRefresh", "Auto-refresh")}
              </Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              className="h-8 px-3.5 rounded-full gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? t("apiStatus.refreshing", "Refreshing...") : t("apiStatus.refresh", "Refresh")}</span>
            </Button>
          </Page.Actions>
        </Page.HeaderRow>
      </Page.Header>

      <div className="space-y-5">
        {/* Standalone Bubble Tabs Navigation */}
        <Page.Tabs
          variant="bubble"
          activeTab={activeSection}
          onTabChange={(val) => setActiveSection(val as any)}
          tabs={[
            {
              id: "SERVICES",
              label: (
                <span className="flex items-center gap-1.5">
                  <Server className="size-3.5" />
                  <span>{t("apiStatus.sectionServices", "API Microservices")}</span>
                  <span className="ml-1 text-[10px] opacity-75 font-mono">
                    ({isLoading ? "..." : data?.totalServices || 0})
                  </span>
                </span>
              ),
            },
            {
              id: "ENV_VARS",
              label: (
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-amber-500" />
                  <span>{t("apiStatus.sectionEnvVars", "Environment Variables")}</span>
                  <span className="ml-1 text-[10px] opacity-75 font-mono">
                    ({isLoading ? "..." : data?.envTotal || 0})
                  </span>
                </span>
              ),
            },
          ]}
        />

        {/* SECTION 1: API MICROSERVICES */}
        {activeSection === "SERVICES" && (
          <div className="space-y-4">
            {/* Search Input + Export Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <Page.SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t("apiStatus.searchPlaceholder", "Search endpoint, service, or category...")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 px-3.5 rounded-full text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs self-end sm:self-auto shrink-0"
              >
                <Download className="size-3.5" />
                <span>{t("common.export", "Export")}</span>
              </Button>
            </div>

            {/* Filter Pills Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Page.FilterPill
                label={t("apiStatus.tableStatus", "Status")}
                value={statusTab && statusTab !== "ALL" ? statusTab : ""}
                options={serviceStatusOptions}
                onChange={(v) => setStatusTab(v as any)}
                onClear={() => setStatusTab("ALL")}
              />
              <Page.FilterPill
                label={t("apiStatus.tableCategory", "Category")}
                value={categoryFilter && categoryFilter !== "ALL" ? categoryFilter : ""}
                options={serviceCategoryOptions}
                onChange={setCategoryFilter}
                onClear={() => setCategoryFilter("ALL")}
              />
              <Page.FilterPill
                label={t("apiStatus.tableLatency", "Latency")}
                value={latencyFilter && latencyFilter !== "ALL" ? latencyFilter : ""}
                options={latencyOptions}
                onChange={setLatencyFilter}
                onClear={() => setLatencyFilter("ALL")}
              />
              {hasActiveServiceFilters && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClearServiceFilters}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                >
                  <X className="size-3 mr-1" />
                  {t("common.clearFilters", "Clear all")}
                </Button>
              )}
            </div>

            {/* KPI Metrics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <MetricCard
                icon={<Server className="h-4 w-4 text-muted-foreground shrink-0" />}
                title={t("apiStatus.kpiTotal", "Total Services")}
                value={
                  <span className="font-mono text-xl font-extrabold text-foreground">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.totalServices || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                title={<span className="text-emerald-600 dark:text-emerald-400">{t("apiStatus.kpiOperational", "Operational")}</span>}
                value={
                  <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.operationalCount || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                title={<span className="text-amber-600 dark:text-amber-400">{t("apiStatus.kpiDegraded", "Degraded")}</span>}
                value={
                  <span className="font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.degradedCount || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                title={<span className="text-red-600 dark:text-red-400">{t("apiStatus.kpiDown", "Outages")}</span>}
                value={
                  <span className="font-mono text-xl font-extrabold text-red-600 dark:text-red-400">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.downCount || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                title={t("apiStatus.kpiAvgLatency", "Avg Latency")}
                value={
                  <span className="font-mono text-xl font-extrabold text-foreground">
                    {isLoading ? (
                      <Skeleton className="h-7 w-16 inline-block" />
                    ) : (
                      <>
                        {data?.averageLatencyMs || 0}{" "}
                        <span className="text-xs font-normal text-muted-foreground">{t("apiStatus.unitMs", "ms")}</span>
                      </>
                    )}
                  </span>
                }
              />
            </div>

            {/* Latency Health Distribution Histogram Card */}
            <Page.ContentCard className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-foreground tracking-tight">
                    {t("apiStatus.latencyDistribution", "Microservice Latency Distribution")}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t("apiStatus.latencyDistributionDesc", "Endpoint response speed and service health breakdown")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
                  {latencyHistogramData.map((d, i) => {
                    const total = data?.totalServices || 1;
                    const pct = (d.value / total) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={i}
                        style={{ width: `${pct}%`, backgroundColor: d.color }}
                        className="h-full transition-all"
                        title={`${d.label}: ${d.value} (${pct.toFixed(0)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap pt-1">
                  {latencyHistogramData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.label}: <strong className="text-foreground">{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </Page.ContentCard>

            {/* Microservices Data Table */}
            {filteredServices.length === 0 ? (
              <Page.ContentCard className="p-8">
                <Page.EmptyState
                  icon={Activity}
                  title={t("apiStatus.noServicesFound", "No microservices match filters")}
                  description={t("apiStatus.noServicesFoundDesc", "Try adjusting your search query, status, or latency filter.")}
                  primaryAction={
                    hasActiveServiceFilters
                      ? {
                          label: t("common.clearFilters", "Clear all filters"),
                          onClick: handleClearServiceFilters,
                        }
                      : undefined
                  }
                />
              </Page.ContentCard>
            ) : (
              <Page.ContentCard className="p-0 border-border/70 overflow-hidden">
                <DataTable
                  columns={serviceColumns}
                  data={paginatedServices}
                  noDataMessage={t("apiStatus.noServicesFound", "No microservices match filters")}
                  loading={isLoading}
                  pagination={{
                    page: servicesPage,
                    totalPages: servicesTotalPages,
                    totalItems: filteredServices.length,
                    limit: servicesLimit,
                    onPageChange: setServicesPage,
                    onLimitChange: setServicesLimit,
                  }}
                />
              </Page.ContentCard>
            )}
          </div>
        )}

        {/* SECTION 2: ENVIRONMENT VARIABLES */}
        {activeSection === "ENV_VARS" && (
          <div className="space-y-4">
            {/* Search Input + Export Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <Page.SearchInput
                  value={envSearchQuery}
                  onChange={setEnvSearchQuery}
                  placeholder={t("apiStatus.envSearchPlaceholder", "Search environment variable key, category, or description...")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 px-3.5 rounded-full text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs self-end sm:self-auto shrink-0"
              >
                <Download className="size-3.5" />
                <span>{t("common.export", "Export")}</span>
              </Button>
            </div>

            {/* Filter Pills Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Page.FilterPill
                label={t("apiStatus.tableEnvStatus", "Status")}
                value={envStatusTab && envStatusTab !== "ALL" ? envStatusTab : ""}
                options={envStatusOptions}
                onChange={(v) => setEnvStatusTab(v as any)}
                onClear={() => setEnvStatusTab("ALL")}
              />
              <Page.FilterPill
                label={t("apiStatus.tableEnvCategory", "Category")}
                value={envCategoryFilter && envCategoryFilter !== "ALL" ? envCategoryFilter : ""}
                options={envCategoryOptions}
                onChange={setEnvCategoryFilter}
                onClear={() => setEnvCategoryFilter("ALL")}
              />
              <Page.FilterPill
                label={t("apiStatus.tableSensitivity", "Sensitivity")}
                value={envSensitivityFilter && envSensitivityFilter !== "ALL" ? envSensitivityFilter : ""}
                options={sensitivityOptions}
                onChange={setEnvSensitivityFilter}
                onClear={() => setEnvSensitivityFilter("ALL")}
              />
              {hasActiveEnvFilters && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClearEnvFilters}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                >
                  <X className="size-3 mr-1" />
                  {t("common.clearFilters", "Clear all")}
                </Button>
              )}
            </div>

            {/* KPI Metrics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                icon={<KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />}
                title={t("apiStatus.envKpiTotal", "Total Variables")}
                value={
                  <span className="font-mono text-xl font-extrabold text-foreground">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.envTotal || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                title={<span className="text-emerald-600 dark:text-emerald-400">{t("apiStatus.envKpiConfigured", "Configured")}</span>}
                value={
                  <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.envConfiguredCount || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                title={<span className="text-amber-600 dark:text-amber-400">{t("apiStatus.envKpiPlaceholder", "Placeholders")}</span>}
                value={
                  <span className="font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.envDegradedCount || 0}
                  </span>
                }
              />
              <MetricCard
                icon={<XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                title={<span className="text-red-600 dark:text-red-400">{t("apiStatus.envKpiMissing", "Missing")}</span>}
                value={
                  <span className="font-mono text-xl font-extrabold text-red-600 dark:text-red-400">
                    {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.envMissingCount || 0}
                  </span>
                }
              />
            </div>

            {/* Environment Variables Data Table */}
            {filteredEnvVariables.length === 0 ? (
              <Page.ContentCard className="p-8">
                <Page.EmptyState
                  icon={KeyRound}
                  title={t("apiStatus.noEnvVarsFound", "No environment variables match filters")}
                  description={t("apiStatus.noEnvVarsFoundDesc", "Try adjusting your search query, configuration status, or category filter.")}
                  primaryAction={
                    hasActiveEnvFilters
                      ? {
                          label: t("common.clearFilters", "Clear all filters"),
                          onClick: handleClearEnvFilters,
                        }
                      : undefined
                  }
                />
              </Page.ContentCard>
            ) : (
              <Page.ContentCard className="p-0 border-border/70 overflow-hidden">
                <DataTable
                  columns={envVarColumns}
                  data={paginatedEnvVariables}
                  noDataMessage={t("apiStatus.noEnvVarsFound", "No environment variables match filters")}
                  loading={isLoading}
                  pagination={{
                    page: envVarsPage,
                    totalPages: envVarsTotalPages,
                    totalItems: filteredEnvVariables.length,
                    limit: envVarsLimit,
                    onPageChange: setEnvVarsPage,
                    onLimitChange: setEnvVarsLimit,
                  }}
                />
              </Page.ContentCard>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}

export default ApiStatusPage;
