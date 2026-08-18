import { useTranslation } from "react-i18next";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Search,
  Server,
  Clock,
  ShieldCheck,
  Zap,
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ApiStatusItem, EnvVarStatusItem } from "@/services/systemService";

export function ApiStatusPage() {
  const { t, i18n } = useTranslation();
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
    filteredEnvVariables,
    refresh,
  } = useApiStatus();

  const isSpanish = i18n.language === "es_DO";

  const formatLastChecked = (isoString?: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString(isSpanish ? "es-DO" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

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

  if (isLoading) {
    return (
      <Page title={t("apiStatus.title")} subtitle={t("apiStatus.subtitle")} isLoading={true}>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </Page>
    );
  }

  const overallStatus = data?.overallStatus || "OPERATIONAL";

  return (
    <Page
      title={t("apiStatus.title")}
      subtitle={t("apiStatus.subtitle")}
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
            className="h-8 gap-1.5 text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("apiStatus.refreshing") : t("apiStatus.refresh")}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overall System Health Status Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs ${
            overallStatus === "OPERATIONAL"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
              : overallStatus === "DEGRADED"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100"
              : "bg-red-500/10 border-red-500/20 text-red-950 dark:text-red-100"
          }`}
        >
          <div className="flex items-center gap-3">
            {overallStatus === "OPERATIONAL" ? (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            ) : overallStatus === "DEGRADED" ? (
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400">
                <XCircle className="h-6 w-6" />
              </div>
            )}

            <div>
              <h2 className="text-base font-bold tracking-tight">
                {overallStatus === "OPERATIONAL"
                  ? t("apiStatus.overallOperational")
                  : overallStatus === "DEGRADED"
                  ? t("apiStatus.overallDegraded")
                  : t("apiStatus.overallDown")}
              </h2>
              <p className="text-xs opacity-80 mt-0.5">
                {t("apiStatus.lastChecked", { time: formatLastChecked(data?.lastChecked) })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium border-t sm:border-t-0 border-current/10 pt-2 sm:pt-0">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 opacity-70" />
              <span>
                {t("apiStatus.kpiAvgLatency")}:{" "}
                <strong className="font-mono">
                  {data?.averageLatencyMs || 0} {t("apiStatus.unitMs")}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 opacity-70" />
              <span>{t("apiStatus.legendUptime")}</span>
            </div>
          </div>
        </div>

        {/* Navigation Section Switcher: Microservices vs Environment Variables */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Tabs
            value={activeSection}
            onValueChange={(val) => setActiveSection(val as any)}
            className="w-full"
          >
            <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <TabsTrigger
                value="SERVICES"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <Server className="h-3.5 w-3.5" />
                <span>{t("apiStatus.sectionServices")}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] font-mono px-1.5 py-0">
                  {data?.totalServices || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="ENV_VARS"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("apiStatus.sectionEnvVars")}</span>
                <Badge variant="secondary" className="ml-1 text-[10px] font-mono px-1.5 py-0">
                  {data?.envTotal || 0}
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
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t("apiStatus.kpiTotal")}
                  </CardTitle>
                  <Server className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                    {data?.totalServices || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Operational Services */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t("apiStatus.kpiOperational")}
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {data?.operationalCount || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Degraded Services */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {t("apiStatus.kpiDegraded")}
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {data?.degradedCount || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Outages */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    {t("apiStatus.kpiDown")}
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
                    {data?.downCount || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Card 5: Average Latency */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t("apiStatus.kpiAvgLatency")}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                    {data?.averageLatencyMs || 0}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      {t("apiStatus.unitMs")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Controls & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
              <Tabs
                value={statusTab}
                onValueChange={(val) => setStatusTab(val as any)}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-8 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5">
                  <TabsTrigger value="ALL" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabAll")} ({data?.totalServices || 0})
                  </TabsTrigger>
                  <TabsTrigger value="OPERATIONAL" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabOperational")} ({data?.operationalCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="DEGRADED" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabDegraded")} ({data?.degradedCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="DOWN" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabDown")} ({data?.downCount || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                <Input
                  type="search"
                  placeholder={t("apiStatus.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8.5 pl-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Services Status Table */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/60">
                  <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableServiceName")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableCategory")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableEndpoint")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableStatus")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableLatency")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableUptime")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableMessage")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-zinc-500 text-xs">
                        {t("apiStatus.noServicesFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service: ApiStatusItem) => (
                      <TableRow
                        key={service.id}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <TableCell className="py-3 font-medium text-xs text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span>{service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                          >
                            {getCategoryLabel(service.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {service.endpoint}
                        </TableCell>
                        <TableCell className="py-3">{getStatusBadge(service.status)}</TableCell>
                        <TableCell className="py-3 font-mono text-xs font-medium">
                          <span
                            className={
                              service.latencyMs < 50
                                ? "text-emerald-600 dark:text-emerald-400"
                                : service.latencyMs < 200
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {service.latencyMs} {t("apiStatus.unitMs")}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {service.uptimePercentage}{t("apiStatus.unitPercent")}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                          {service.message ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help underline decoration-dotted decoration-zinc-300 dark:decoration-zinc-700">
                                    {service.message}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">{service.message}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            t("apiStatus.dash")
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* SECTION 2: ENVIRONMENT VARIABLES (.ENV) */}
        {activeSection === "ENV_VARS" && (
          <div className="space-y-6">
            {/* KPI Metrics Cards for Env Vars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Total Env Vars */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {t("apiStatus.kpiEnvTotal")}
                  </CardTitle>
                  <Sliders className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                    {data?.envTotal || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Fully Configured */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t("apiStatus.kpiEnvConfigured")}
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {data?.envConfiguredCount || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Default Placeholders */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {t("apiStatus.kpiEnvDegraded")}
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {data?.envDegradedCount || 0}
                  </div>
                </CardContent>
              </Card>

              {/* Missing / Unset */}
              <Card className="bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3.5 px-4">
                  <CardTitle className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    {t("apiStatus.kpiEnvMissing")}
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent className="pb-3.5 px-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
                    {data?.envMissingCount || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Environment Variables Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
              <Tabs
                value={envStatusTab}
                onValueChange={(val) => setEnvStatusTab(val as any)}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-8 bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5">
                  <TabsTrigger value="ALL" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvAll")} ({data?.envTotal || 0})
                  </TabsTrigger>
                  <TabsTrigger value="CONFIGURED" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvConfigured")} ({data?.envConfiguredCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="DEFAULT_PLACEHOLDER" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvDegraded")} ({data?.envDegradedCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="MISSING" className="text-xs h-7 px-3 cursor-pointer">
                    {t("apiStatus.tabEnvMissing")} ({data?.envMissingCount || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                <Input
                  type="search"
                  placeholder={t("apiStatus.searchEnvPlaceholder")}
                  value={envSearchQuery}
                  onChange={(e) => setEnvSearchQuery(e.target.value)}
                  className="h-8.5 pl-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Environment Variables Table */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/60">
                  <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableEnvKey")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableEnvCategory")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableEnvStatus")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableEnvValue")}
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider py-3">
                      {t("apiStatus.tableEnvDescription")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnvVariables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-zinc-500 text-xs">
                        {t("apiStatus.noEnvVarsFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEnvVariables.map((item: EnvVarStatusItem) => (
                      <TableRow
                        key={item.key}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <TableCell className="py-3 font-medium text-xs text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            {item.isSecret ? (
                              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <FileCode className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            )}
                            <span className="font-mono text-[12px] font-semibold">{item.key}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                          >
                            {getEnvCategoryLabel(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">{getEnvStatusBadge(item.status)}</TableCell>
                        <TableCell className="py-3 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded font-mono ${
                                item.isSecret
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              {item.valueDisplay}
                            </span>
                            {item.isSecret ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Shield className="h-3.5 w-3.5 text-amber-500 cursor-help opacity-80" />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {t("apiStatus.secretMaskedTooltip")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-zinc-400 cursor-help opacity-70" />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {t("apiStatus.publicValueTooltip")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                          {item.description}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

export default ApiStatusPage;

