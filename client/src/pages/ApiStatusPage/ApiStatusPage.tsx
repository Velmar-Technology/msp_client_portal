import { useMemo } from "react";
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
  Sliders,
  Shield,
  Info,
} from "lucide-react";
import { useApiStatus } from "@/hooks/useApiStatus";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import SummaryCard from "@/components/dashboard/summary-card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ApiStatusItem, EnvVarStatusItem } from "@/services/systemService";

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
    refresh,
  } = useApiStatus();

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "CORE":
        return t("apiStatus.categoryCore");
      case "SERVICES":
        return t("apiStatus.categoryServices");
      case "BUSINESS":
        return t("apiStatus.categoryBusiness");
      case "INTEGRATION":
        return t("apiStatus.categoryIntegration");
      default:
        return category;
    }
  };

  const getEnvCategoryLabel = (category: string) => {
    switch (category) {
      case "DATABASE":
        return t("apiStatus.envCategoryDatabase");
      case "SERVER":
        return t("apiStatus.envCategoryServer");
      case "SECURITY":
        return t("apiStatus.envCategorySecurity");
      case "EMAIL":
        return t("apiStatus.envCategoryEmail");
      case "WHATSAPP":
        return t("apiStatus.envCategoryWhatsapp");
      case "UPLOADS":
        return t("apiStatus.envCategoryUploads");
      case "OAUTH":
        return t("apiStatus.envCategoryOauth");
      case "STORAGE":
        return t("apiStatus.envCategoryStorage");
      case "PAYPAL":
        return t("apiStatus.envCategoryPaypal");
      case "RMM":
        return t("apiStatus.envCategoryRmm");
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
            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold gap-1 text-[10px] uppercase tracking-wider"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {t("apiStatus.statusOperational")}
          </Badge>
        );
      case "DEGRADED":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-semibold gap-1 text-[10px] uppercase tracking-wider"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            {t("apiStatus.statusDegraded")}
          </Badge>
        );
      case "DOWN":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 font-semibold gap-1 text-[10px] uppercase tracking-wider"
          >
            <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
            {t("apiStatus.statusDown")}
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
            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold gap-1 text-[10px] uppercase tracking-wider"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {t("apiStatus.statusConfigured")}
          </Badge>
        );
      case "DEFAULT_PLACEHOLDER":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-semibold gap-1 text-[10px] uppercase tracking-wider"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            {t("apiStatus.statusPlaceholder")}
          </Badge>
        );
      case "MISSING":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 font-semibold gap-1 text-[10px] uppercase tracking-wider"
          >
            <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
            {t("apiStatus.statusMissing")}
          </Badge>
        );
    }
  };

  // 1. Column Definitions for API Microservices Table
  const serviceColumns = useMemo<ColumnDef<ApiStatusItem, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableServiceName")} />,
        cell: ({ row }) => {
          const service = row.original;
          return (
            <div className="flex items-center gap-2 font-medium text-xs text-zinc-900 dark:text-zinc-100">
              <Activity className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>{service.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableCategory")} />,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            {getCategoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: "endpoint",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEndpoint")} />,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">{row.original.endpoint}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableStatus")} />,
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "latencyMs",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableLatency")} />,
        cell: ({ row }) => {
          const latencyMs = row.original.latencyMs;
          return (
            <span
              className={cn(
                "font-mono text-xs font-medium",
                latencyMs < 50
                  ? "text-emerald-600 dark:text-emerald-400"
                  : latencyMs < 200
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400",
              )}
            >
              {latencyMs} {t("apiStatus.unitMs")}
            </span>
          );
        },
      },
      {
        accessorKey: "uptimePercentage",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableUptime")} />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
            {row.original.uptimePercentage}
            {t("apiStatus.unitPercent")}
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
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvKey")} />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2 font-medium text-xs text-zinc-900 dark:text-zinc-100">
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
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvCategory")} />,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            {getEnvCategoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvStatus")} />,
        cell: ({ row }) => getEnvStatusBadge(row.original.status),
      },
      {
        accessorKey: "valueDisplay",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvValue")} />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={cn(
                  "px-2 py-0.5 rounded font-mono",
                  item.isSecret
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
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
                    <TooltipContent className="text-xs">{t("apiStatus.secretMaskedTooltip")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-zinc-400 cursor-help opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">{t("apiStatus.publicValueTooltip")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("apiStatus.tableEnvDescription")} />,
        cell: ({ row }) => (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm block">{row.original.description}</span>
        ),
      },
    ],
    [t],
  );

  return (
    <Page
      title={t("apiStatus.title")}
      subtitle={t("apiStatus.subtitle")}
      isLoading={isLoading}
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-refresh"
              checked={isAutoRefresh}
              onCheckedChange={(checked) => setIsAutoRefresh(!!checked)}
            />
            <Label
              htmlFor="auto-refresh"
              className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer font-medium select-none"
            >
              {t("apiStatus.autoRefresh")}
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            className="h-7 px-3 gap-1 text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? t("apiStatus.refreshing") : t("apiStatus.refresh")}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Section Switcher: Microservices vs Environment Variables */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Tabs value={activeSection} onValueChange={(val) => setActiveSection(val as any)} className="w-full">
            <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <TabsTrigger
                value="SERVICES"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <Server className="h-3.5 w-3.5" />
                <span>{t("apiStatus.sectionServices")}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] font-mono px-1.5 py-0 min-w-[20px] inline-flex justify-center"
                >
                  {isLoading ? <Skeleton className="h-3 w-4" /> : data?.totalServices || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="ENV_VARS"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("apiStatus.sectionEnvVars")}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] font-mono px-1.5 py-0 min-w-[20px] inline-flex justify-center"
                >
                  {isLoading ? <Skeleton className="h-3 w-4" /> : data?.envTotal || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* SECTION 1: API MICROSERVICES */}
        {activeSection === "SERVICES" && (
          <div className="space-y-6">
            {/* KPI Metrics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Card 1: Total Services */}
              <SummaryCard
                icon={<Server className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />}
                title={t("apiStatus.kpiTotal")}
                value={
                  <span className="font-mono text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.totalServices || 0}
                  </span>
                }
              />

              {/* Card 2: Operational Services */}
              <SummaryCard
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                title={<span className="text-emerald-600 dark:text-emerald-400">{t("apiStatus.kpiOperational")}</span>}
                value={
                  <span className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.operationalCount || 0}
                  </span>
                }
              />

              {/* Card 3: Degraded Services */}
              <SummaryCard
                icon={<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                title={<span className="text-amber-600 dark:text-amber-400">{t("apiStatus.kpiDegraded")}</span>}
                value={
                  <span className="font-mono text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.degradedCount || 0}
                  </span>
                }
              />

              {/* Card 4: Outages */}
              <SummaryCard
                icon={<XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                title={<span className="text-red-600 dark:text-red-400">{t("apiStatus.kpiDown")}</span>}
                value={
                  <span className="font-mono text-2xl font-extrabold text-red-600 dark:text-red-400">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.downCount || 0}
                  </span>
                }
              />

              {/* Card 5: Average Latency */}
              <SummaryCard
                icon={<Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />}
                title={t("apiStatus.kpiAvgLatency")}
                value={
                  <span className="font-mono text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 inline-block" />
                    ) : (
                      <>
                        {data?.averageLatencyMs || 0}{" "}
                        <span className="text-xs font-normal text-zinc-500">{t("apiStatus.unitMs")}</span>
                      </>
                    )}
                  </span>
                }
              />
            </div>

            {/* Status Tabs Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
              <Tabs value={statusTab} onValueChange={(val) => setStatusTab(val as any)} className="w-full sm:w-auto">
                <TabsList className="h-8 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5">
                  <TabsTrigger value="ALL" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabAll")} (
                    {isLoading ? <Skeleton className="h-3 w-4 inline-block align-middle" /> : data?.totalServices || 0})
                  </TabsTrigger>
                  <TabsTrigger value="OPERATIONAL" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabOperational")} (
                    {isLoading ? (
                      <Skeleton className="h-3 w-4 inline-block align-middle" />
                    ) : (
                      data?.operationalCount || 0
                    )}
                    )
                  </TabsTrigger>
                  <TabsTrigger value="DEGRADED" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabDegraded")} (
                    {isLoading ? <Skeleton className="h-3 w-4 inline-block align-middle" /> : data?.degradedCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="DOWN" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabDown")} (
                    {isLoading ? <Skeleton className="h-3 w-4 inline-block align-middle" /> : data?.downCount || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Reusable DataTable Component */}
            <DataTable
              columns={serviceColumns}
              data={paginatedServices}
              loading={isLoading}
              noDataMessage={t("apiStatus.noServicesFound")}
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: t("apiStatus.searchPlaceholder"),
              }}
              pagination={{
                page: servicesPage,
                totalPages: servicesTotalPages,
                totalItems: filteredServices.length,
                limit: servicesLimit,
                onPageChange: setServicesPage,
                onLimitChange: (limit) => {
                  setServicesLimit(limit);
                  setServicesPage(1);
                },
              }}
            />
          </div>
        )}

        {/* SECTION 2: ENVIRONMENT VARIABLES */}
        {activeSection === "ENV_VARS" && (
          <div className="space-y-6">
            {/* KPI Metrics Cards for Env Vars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Total Env Vars */}
              <SummaryCard
                icon={<Sliders className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />}
                title={t("apiStatus.kpiEnvTotal")}
                value={
                  <span className="font-mono text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.envTotal || 0}
                  </span>
                }
              />

              {/* Fully Configured */}
              <SummaryCard
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                title={
                  <span className="text-emerald-600 dark:text-emerald-400">{t("apiStatus.kpiEnvConfigured")}</span>
                }
                value={
                  <span className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.envConfiguredCount || 0}
                  </span>
                }
              />

              {/* Default Placeholders */}
              <SummaryCard
                icon={<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                title={<span className="text-amber-600 dark:text-amber-400">{t("apiStatus.kpiEnvDegraded")}</span>}
                value={
                  <span className="font-mono text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.envDegradedCount || 0}
                  </span>
                }
              />

              {/* Missing / Unset */}
              <SummaryCard
                icon={<XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                title={<span className="text-red-600 dark:text-red-400">{t("apiStatus.kpiEnvMissing")}</span>}
                value={
                  <span className="font-mono text-2xl font-extrabold text-red-600 dark:text-red-400">
                    {isLoading ? <Skeleton className="h-8 w-12 inline-block" /> : data?.envMissingCount || 0}
                  </span>
                }
              />
            </div>

            {/* Environment Status Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
              <Tabs
                value={envStatusTab}
                onValueChange={(val) => setEnvStatusTab(val as any)}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-8 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5">
                  <TabsTrigger value="ALL" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvAll")} (
                    {isLoading ? <Skeleton className="h-3 w-4 inline-block align-middle" /> : data?.envTotal || 0})
                  </TabsTrigger>
                  <TabsTrigger value="CONFIGURED" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvConfigured")} (
                    {isLoading ? (
                      <Skeleton className="h-3 w-4 inline-block align-middle" />
                    ) : (
                      data?.envConfiguredCount || 0
                    )}
                    )
                  </TabsTrigger>
                  <TabsTrigger value="DEFAULT_PLACEHOLDER" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvDegraded")} (
                    {isLoading ? (
                      <Skeleton className="h-3 w-4 inline-block align-middle" />
                    ) : (
                      data?.envDegradedCount || 0
                    )}
                    )
                  </TabsTrigger>
                  <TabsTrigger value="MISSING" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvMissing")} (
                    {isLoading ? (
                      <Skeleton className="h-3 w-4 inline-block align-middle" />
                    ) : (
                      data?.envMissingCount || 0
                    )}
                    )
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Reusable DataTable Component */}
            <DataTable
              columns={envVarColumns}
              data={paginatedEnvVariables}
              loading={isLoading}
              noDataMessage={t("apiStatus.noEnvVarsFound")}
              search={{
                value: envSearchQuery,
                onChange: setEnvSearchQuery,
                placeholder: t("apiStatus.searchEnvPlaceholder"),
              }}
              pagination={{
                page: envVarsPage,
                totalPages: envVarsTotalPages,
                totalItems: filteredEnvVariables.length,
                limit: envVarsLimit,
                onPageChange: setEnvVarsPage,
                onLimitChange: (limit) => {
                  setEnvVarsLimit(limit);
                  setEnvVarsPage(1);
                },
              }}
            />
          </div>
        )}
      </div>
    </Page>
  );
}

export default ApiStatusPage;
