import * as React from "react";

/**
 * Standard view modes inspired by Odoo ERP.
 */
export type StandardPageViewMode = "list" | "kanban" | "form" | "pivot" | "activity" | "calendar";
export type PageViewMode = StandardPageViewMode | (string & {});

/**
 * Option definition for a view in the Page ViewSwitcher.
 */
export interface PageViewOption<T extends string = string> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Filter chip definition for search and filter bars.
 */
export interface PageFilterChip {
  id: string;
  label: string;
  value?: string;
  onRemove?: () => void;
}

/**
 * State and mutation interface provided by PageContext.
 */
export interface PageContextValue<T extends string = string> {
  activeView: T;
  setActiveView: (view: T) => void;
  availableViews: PageViewOption<T>[];
  setAvailableViews?: (views: PageViewOption<T>[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  totalCount?: number;
  setTotalCount: (total?: number) => void;
  isLoading?: boolean;
}

/**
 * Configuration options for the usePageView hook.
 */
export interface UsePageViewOptions<T extends string = string> {
  defaultView?: T;
  availableViews?: PageViewOption<T>[];
  syncUrl?: boolean;
  viewParamKey?: string;
  searchParamKey?: string;
  pageParamKey?: string;
  pageSizeParamKey?: string;
  defaultPage?: number;
  defaultPageSize?: number;
  totalCount?: number;
  isLoading?: boolean;
}

/**
 * Props for PageProvider.
 */
export interface PageProviderProps<T extends string = string> extends UsePageViewOptions<T> {
  children: React.ReactNode;
  controller?: PageContextValue<T>;
}

/**
 * Props for PageControlPanel.
 */
export interface PageControlPanelProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  searchSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  viewsSlot?: React.ReactNode;
  pagerSlot?: React.ReactNode;
  showBreadcrumbs?: boolean;
  isLoading?: boolean;
}

/**
 * Props for PageViewSwitcher.
 */
export interface PageViewSwitcherProps<T extends string = string> {
  value?: T;
  onChange?: (value: T) => void;
  options?: PageViewOption<T>[];
  size?: "sm" | "default" | "lg";
  className?: string;
  "aria-label"?: string;
}

/**
 * Props for PageSearch.
 */
export interface PageSearchProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "onChange" | "value" | "size"> {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  filterChips?: PageFilterChip[];
  onRemoveChip?: (chipId: string) => void;
  placeholder?: string;
  shortcutHint?: boolean;
}

/**
 * Props for PagePager.
 */
export interface PagePagerProps extends React.ComponentPropsWithoutRef<"div"> {
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

/**
 * Props for PageView conditional container.
 */
export interface PageViewProps extends React.ComponentPropsWithoutRef<"div"> {
  type: PageViewMode;
  children: React.ReactNode;
}

/**
 * Stage item in an Odoo-style StatusBar.
 */
export interface PageStatusStage {
  id: string;
  label: string;
  isCurrent?: boolean;
  isCompleted?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Props for PageStatusBar.
 */
export interface PageStatusBarProps extends React.ComponentPropsWithoutRef<"div"> {
  stages?: PageStatusStage[];
  currentStageId?: string;
  onStageSelect?: (stageId: string) => void;
  actions?: React.ReactNode;
}
