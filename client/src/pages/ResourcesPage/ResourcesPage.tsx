import { useMemo } from "react";
import { Download, Package, BookOpen, Compass, FileText, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourcesPage } from "@/hooks/useResourcesPage";
import type { ResourceItem, ResourceCategory } from "@/lib/resourceCatalog";

const CATEGORY_ICONS: Record<ResourceCategory, React.ComponentType<{ className?: string }>> = {
  software: Package,
  manual: BookOpen,
  guide: Compass,
  document: FileText,
};

function ResourceCard({ item, onDownload }: { item: ResourceItem; onDownload: (item: ResourceItem) => void }) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[item.category];
  const updated = new Date(item.updatedAt).toLocaleDateString();

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200 dark:border-zinc-800 shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{t(item.titleKey)}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                {t(`resources.cat.${item.category}`)}
              </p>
              {item.os && item.os.length > 0 && (
                <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800">
                  {item.os.map((os) => t(`resources.os.${os}`)).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-mono font-semibold text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5">
          {item.fileType}
        </span>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{t(item.descriptionKey)}</p>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] text-zinc-400">
        <span className="font-mono">
          {item.fileSize} · {updated}
        </span>
        <button
          type="button"
          onClick={() => onDownload(item)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Download className="h-3 w-3" />
          {t("resources.download")}
        </button>
      </div>
    </div>
  );
}

export function ResourcesPage() {
  const { t } = useTranslation();
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
            <Skeleton className="w-full sm:w-64 h-9" />
            <Skeleton className="w-full sm:w-64 h-9" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-40" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("resources.searchPlaceholder")}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="resources-os-filter" className="text-[10px] uppercase font-bold text-zinc-400">
                {t("resources.filterByOs")}
              </label>
              <select
                id="resources-os-filter"
                value={selectedOs}
                onChange={(e) => setSelectedOs(e.target.value as typeof selectedOs)}
                className="h-9 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer font-medium"
              >
                {osFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="resources-plan-filter" className="text-[10px] uppercase font-bold text-zinc-400">
                {t("resources.filterByPlan")}
              </label>
              <select
                id="resources-plan-filter"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as typeof selectedPlan)}
                className="h-9 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer font-medium"
              >
                {planFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resource list */}
        {filteredResources.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center space-y-2">
            <FileText className="h-6 w-6 text-zinc-300 mx-auto" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t("resources.emptyTitle")}</p>
            <p className="text-xs text-zinc-500">{t("resources.emptyDesc")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredResources.map((item) => (
              <ResourceCard key={item.id} item={item} onDownload={handleDownload} />
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
    t,
  ]);

  return (
    <Page title={t("resources.title")} subtitle={t("resources.subtitle")} isLoading={false}>
      {body}
    </Page>
  );
}

export default ResourcesPage;
