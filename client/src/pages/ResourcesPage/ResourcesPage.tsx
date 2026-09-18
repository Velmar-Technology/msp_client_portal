import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/Page";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useResourcesPage } from "@/hooks/useResourcesPage";
import type { ResourceItem } from "@/lib/resourceCatalog";

import { RESOURCE_CATEGORY_ICONS as CATEGORY_ICONS } from "@/constants/resources";

function ResourceCard({ item, onDownload }: { item: ResourceItem; onDownload: (item: ResourceItem) => void }) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[item.category];
  const updated = new Date(item.updatedAt).toLocaleDateString();

  return (
    <Card className="p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 bg-muted text-muted-foreground rounded-md border border-border shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate font-heading">{t(item.titleKey)}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {t(`resources.cat.${item.category}`)}
              </p>
              {item.os && item.os.length > 0 && (
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                  {item.os.map((os) => t(`resources.os.${os}`)).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-mono font-semibold text-muted-foreground uppercase bg-muted border border-border rounded px-1.5 py-0.5">
          {item.fileType}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">{t(item.descriptionKey)}</p>

      <CardFooter className="p-0 border-none flex items-center justify-between gap-2 pt-2 border-t border-border text-[10px] text-muted-foreground mt-auto">
        <span className="font-mono">
          {item.fileSize} · {updated}
        </span>
        <Button
          type="button"
          onClick={() => onDownload(item)}
          size="sm"
          className="gap-1.5 text-[11px] font-semibold cursor-pointer"
        >
          <Download className="h-3 w-3" />
          {t("resources.download")}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ResourceListItem({ item, onDownload }: { item: ResourceItem; onDownload: (item: ResourceItem) => void }) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[item.category];
  const updated = new Date(item.updatedAt).toLocaleDateString();

  return (
    <Card className="p-3.5 shadow-xs hover:shadow-sm transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="p-2 bg-muted text-muted-foreground rounded-md border border-border shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground truncate font-heading">{t(item.titleKey)}</h3>
            <span className="shrink-0 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {t(`resources.cat.${item.category}`)}
            </span>
            {item.os && item.os.length > 0 && (
              <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                {item.os.map((os) => t(`resources.os.${os}`)).join(", ")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t(item.descriptionKey)}</p>
        </div>
      </div>

      <CardFooter className="p-0 border-none flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border text-xs text-muted-foreground">
        <span className="shrink-0 text-[10px] font-mono font-semibold text-muted-foreground uppercase bg-muted border border-border rounded px-1.5 py-0.5">
          {item.fileType}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {item.fileSize} · {updated}
        </span>
        <Button
          type="button"
          onClick={() => onDownload(item)}
          size="sm"
          className="gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          {t("resources.download")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ResourcesPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"tiled" | "list">("tiled");
  const {
    loading,
    selectedPlan,
    setSelectedPlan,
    planFilterOptions,
    selectedOs,
    setSelectedOs,
    osFilterOptions,
    searchTerm,
    setSearchTerm,
    filteredResources,
    handleDownload,
  } = useResourcesPage();

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Skeleton className="w-full sm:w-64 h-7" />
            <Skeleton className="w-full sm:w-64 h-7" />
          </div>
          {viewMode === "tiled" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-40" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-16" />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <InputGroup className="w-full sm:w-72">
            <InputGroupInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("resources.searchPlaceholder")}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="resources-os-filter"
                  className="text-[10px] uppercase font-bold text-muted-foreground select-none"
                >
                  {t("resources.filterByOs")}
                </label>
                <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                  <Select value={selectedOs} onValueChange={(val) => setSelectedOs(val as typeof selectedOs)}>
                    <SelectTrigger
                      id="resources-os-filter"
                      aria-label={t("resources.filterByOs")}
                      size="default"
                      className="px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                    >
                      <SelectValue placeholder={t("resources.filterByOs")} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {osFilterOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="resources-plan-filter"
                  className="text-[10px] uppercase font-bold text-muted-foreground select-none"
                >
                  {t("resources.filterByPlan")}
                </label>
                <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                  <Select value={selectedPlan} onValueChange={(val) => setSelectedPlan(val as typeof selectedPlan)}>
                    <SelectTrigger
                      id="resources-plan-filter"
                      aria-label={t("resources.filterByPlan")}
                      size="default"
                      className="px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                    >
                      <SelectValue placeholder={t("resources.filterByPlan")} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {planFilterOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <ViewToggle
              size="sm"
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
        </div>

        {/* Resource list */}
        {filteredResources.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">{t("resources.emptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("resources.emptyDesc")}</p>
          </Card>
        ) : viewMode === "tiled" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredResources.map((item) => (
              <ResourceCard key={item.id} item={item} onDownload={handleDownload} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredResources.map((item) => (
              <ResourceListItem key={item.id} item={item} onDownload={handleDownload} />
            ))}
          </div>
        )}
      </div>
    );
  }, [
    loading,
    searchTerm,
    setSearchTerm,
    selectedPlan,
    setSelectedPlan,
    planFilterOptions,
    selectedOs,
    setSelectedOs,
    osFilterOptions,
    filteredResources,
    handleDownload,
    viewMode,
    t,
  ]);

  return (
    <Page isLoading={false}>
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t("resources.title")}</Page.Title>
            <Page.Description>{t("resources.subtitle")}</Page.Description>
          </Page.TitleGroup>
        </Page.HeaderRow>
      </Page.Header>
      {body}
    </Page>
  );
}

export default ResourcesPage;
