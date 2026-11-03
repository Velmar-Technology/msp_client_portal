import { useMemo } from "react";
import { Download, FileText, LayoutGrid, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useResourcesPage } from "@/hooks/useResourcesPage";
import type { ResourceItem } from "@/lib/resourceCatalog";
import { RESOURCE_CATEGORY_ICONS as CATEGORY_ICONS } from "@/constants/resources";

import { PageSearchInput } from "@/components/shared/PageSearchInput";
import { PageFilterPill } from "@/components/shared/PageFilterPill";
import { PageContentCard } from "@/components/shared/PageContentCard";
import { PageEmptyState } from "@/components/shared/PageEmptyState";

export type ResourceViewMode = "tiled" | "list";

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
            </div>
          </div>
        </div>
        {item.os && item.os.length > 0 && (
          <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            {item.os.map((os) => t(`resources.os.${os}`)).join(", ")}
          </span>
        )}
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
  const {
    loading,
    selectedOs,
    setSelectedOs,
    osFilterOptions,
    searchTerm,
    setSearchTerm,
    filteredResources,
    handleDownload,
  } = useResourcesPage();

  const availableViews = useMemo(
    () => [
      {
        value: "tiled" as const,
        icon: LayoutGrid,
        title: t("resources.viewTiled", "Tiled"),
        ariaLabel: t("resources.viewTiled", "Tiled"),
      },
      {
        value: "list" as const,
        icon: List,
        title: t("resources.viewList", "List"),
        ariaLabel: t("resources.viewList", "List"),
      },
    ],
    [t],
  );

  const hasActiveFilters = Boolean(searchTerm.trim() || (selectedOs && selectedOs !== "ALL"));

  const handleClearAll = () => {
    setSearchTerm("");
    setSelectedOs("ALL");
  };

  return (
    <Page<ResourceViewMode> defaultView="tiled" availableViews={availableViews} isLoading={loading}>
      <div className="flex flex-col gap-5">
        {/* Page Title & View Switcher */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-heading">
            {t("resources.title")}
          </h1>
          <Page.ViewSwitcher size="sm" />
        </div>

        {/* ElevenLabs Wide Search Bar */}
        <PageSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("resources.searchPlaceholder") || "Search resources..."}
        />

        {/* ElevenLabs + Filter Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
          <PageFilterPill
            label={t("resources.filterByOs") || "OS"}
            value={selectedOs === "ALL" ? "" : selectedOs}
            options={osFilterOptions}
            onChange={(val) => setSelectedOs(val as typeof selectedOs)}
            onClear={() => setSelectedOs("ALL")}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleClearAll}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("resources.clearFilters") || "Clear all"}
            </Button>
          )}
        </div>

        {/* Populated Content or Empty State Card */}
        {!loading && filteredResources.length === 0 ? (
          <PageContentCard>
            <PageEmptyState
              icon={FileText}
              title={t("resources.emptyTitle") || "No resources found"}
              description={t("resources.emptyDesc") || "No resources match your search or filter criteria."}
              actionLabel={hasActiveFilters ? (t("resources.clearFilters") || "Clear all filters") : undefined}
              onAction={hasActiveFilters ? handleClearAll : undefined}
            />
          </PageContentCard>
        ) : (
          <>
            {/* TILED (GRID) VIEW */}
            <Page.View type="tiled" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-40" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredResources.map((item) => (
                    <ResourceCard key={item.id} item={item} onDownload={handleDownload} />
                  ))}
                </div>
              )}
            </Page.View>

            {/* LIST VIEW */}
            <Page.View type="list" className="space-y-4">
              {loading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-16" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredResources.map((item) => (
                    <ResourceListItem key={item.id} item={item} onDownload={handleDownload} />
                  ))}
                </div>
              )}
            </Page.View>
          </>
        )}
      </div>
    </Page>
  );
}

export default ResourcesPage;
