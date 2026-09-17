import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { cn } from "@/lib/utils";
import { PageSearch } from "./PageSearch";
import { PageViewSwitcher } from "./PageViewSwitcher";
import { PagePager } from "./PagePager";
import type { PageControlPanelProps } from "./types";

/**
 * Unified Odoo-style Control Panel component.
 * Organizes breadcrumbs, title, primary action buttons, search, filters,
 * compact pager, and view switcher into a cohesive header zone.
 */
export function PageControlPanel({
  title,
  subtitle,
  breadcrumbs,
  actions,
  searchSlot,
  filtersSlot,
  viewsSlot,
  pagerSlot,
  showBreadcrumbs = true,
  isLoading = false,
  className,
  children,
  ...props
}: PageControlPanelProps) {
  return (
    <div className={cn("mb-6 space-y-3 pb-3 border-b border-border/40", className)} {...props}>
      {/* 1. Breadcrumbs row */}
      {showBreadcrumbs && (breadcrumbs ?? <Breadcrumbs className="mb-2 text-muted-foreground text-xs" />)}

      {/* 2. Main Title & Action Row */}
      <div className="flex flex-col sm:flex-row min-h-12 justify-between items-start sm:items-center gap-3">
        {/* Title and subtitle */}
        {(title || subtitle) && (
          <div className="space-y-0.5 min-w-0">
            {title && (
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading animate-fade-in truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground animate-fade-in line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Primary Action buttons */}
        {actions && (
          isLoading ? (
            <Skeleton className="animate-fade-in shrink-0 w-32 h-7 rounded-sm" />
          ) : (
            <div className="flex items-center gap-2 animate-fade-in shrink-0">
              {actions}
            </div>
          )
        )}
      </div>

      {/* 3. Search, Filters, Pager & View Switcher Bar */}
      {(searchSlot !== null || filtersSlot || viewsSlot !== null || pagerSlot !== null || children) && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          {/* Left / Center: Search bar and filter slots */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {searchSlot !== undefined ? searchSlot : <PageSearch />}
            {filtersSlot}
          </div>

          {/* Right: Pager and View Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {pagerSlot !== undefined ? pagerSlot : <PagePager />}
            {viewsSlot !== undefined ? viewsSlot : <PageViewSwitcher />}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
