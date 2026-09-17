import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";
import {
  PageProvider,
  usePageContext,
  usePageView,
} from "./page/PageContext";
import { PageControlPanel } from "./page/PageControlPanel";
import { PageViewSwitcher } from "./page/PageViewSwitcher";
import { PageSearch } from "./page/PageSearch";
import { PagePager } from "./page/PagePager";
import { PageView } from "./page/PageView";
import { PageStatusBar } from "./page/PageStatusBar";
import { PageSheet, PageForm } from "./page/PageSheet";
import { PageFormHeader } from "./page/PageFormHeader";
import { PageStatBox, PageStatButton } from "./page/PageStatButton";
import { PageNotebook, PageNotebookTab } from "./page/PageNotebook";
import { PageFieldGroup, PageField } from "./page/PageField";
import {
  PageDashboard,
  PageDashboardKpi,
  PageDashboardSection,
} from "./page/PageDashboard";
import { PageCalendar } from "./page/PageCalendar";
import { PageGraph } from "./page/PageGraph";
import type {
  PageContextValue,
  UsePageViewOptions,
} from "./page/types";

export interface PageProps<T extends string = string>
  extends Omit<React.ComponentPropsWithoutRef<"div">, "title">,
    UsePageViewOptions<T> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
  isLoading?: boolean;
  controller?: PageContextValue<T>;
}

/**
 * Enterprise Page layout container with Odoo-inspired View Architecture.
 * Supports standard layout (title, subtitle, actions, breadcrumbs) as well as
 * compound slots (ControlPanel, ViewSwitcher, Search, Pager, View, StatusBar).
 */
export function PageRoot<T extends string = string>({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  children,
  className,
  isLoading,
  controller,
  activeView,
  onViewChange,
  defaultView,
  availableViews,
  syncUrl,
  viewParamKey,
  searchParamKey,
  pageParamKey,
  pageSizeParamKey,
  defaultPage,
  defaultPageSize,
  totalCount,
  ...props
}: PageProps<T>) {
  const content = (
    <MaxWidthWrapper className={cn("animate-fade-in text-foreground", className)} {...props}>
      {/* Backward-compatible legacy header: only rendered if title, subtitle, or actions are passed */}
      {(title || subtitle || actions) && (
        <div className="mb-6">
          {showBreadcrumbs && <Breadcrumbs className="mb-4 text-muted-foreground text-xs" />}
          <div className="flex flex-col sm:flex-row min-h-20 justify-between items-start sm:items-center gap-3">
            {(title || subtitle) && (
              <div className="space-y-0.5 min-w-0">
                {title && (
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading animate-fade-in truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground animate-fade-in">{subtitle}</p>
                )}
              </div>
            )}
            {actions ? (
              isLoading ? (
                <Skeleton className="animate-fade-in shrink-0 w-32 h-7 rounded-sm" />
              ) : (
                <div className="flex items-center gap-2 animate-fade-in shrink-0">{actions}</div>
              )
            ) : null}
          </div>
        </div>
      )}

      {children}
    </MaxWidthWrapper>
  );

  const shouldSyncUrl = syncUrl ?? Boolean(controller || activeView || defaultView || availableViews);

  return (
    <PageProvider
      controller={controller}
      activeView={activeView}
      onViewChange={onViewChange}
      defaultView={defaultView}
      availableViews={availableViews}
      syncUrl={shouldSyncUrl}
      viewParamKey={viewParamKey}
      searchParamKey={searchParamKey}
      pageParamKey={pageParamKey}
      pageSizeParamKey={pageSizeParamKey}
      defaultPage={defaultPage}
      defaultPageSize={defaultPageSize}
      totalCount={totalCount}
      isLoading={isLoading}
    >
      {content}
    </PageProvider>
  );
}

// Compound component assembly
export const Page = Object.assign(PageRoot, {
  ControlPanel: PageControlPanel,
  ViewSwitcher: PageViewSwitcher,
  Search: PageSearch,
  Pager: PagePager,
  View: PageView,
  StatusBar: PageStatusBar,
  Sheet: PageSheet,
  Form: PageForm,
  FormHeader: PageFormHeader,
  StatBox: PageStatBox,
  StatButton: PageStatButton,
  Notebook: PageNotebook,
  NotebookTab: PageNotebookTab,
  FieldGroup: PageFieldGroup,
  Field: PageField,
  Dashboard: PageDashboard,
  DashboardKpi: PageDashboardKpi,
  DashboardSection: PageDashboardSection,
  Calendar: PageCalendar,
  Date: PageCalendar,
  Graph: PageGraph,
  Provider: PageProvider,
  usePageContext,
  usePageView,
});

export default Page;
export * from "./page/index";
