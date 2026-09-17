import * as React from "react";

/**
 * Standard view modes inspired by Odoo ERP.
 */
export type StandardPageViewMode =
  | "list"
  | "kanban"
  | "form"
  | "pivot"
  | "activity"
  | "calendar"
  | "dashboard"
  | "graph";
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
  activeView?: T;
  onViewChange?: (view: T) => void;
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
  tabsSlot?: React.ReactNode;
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

/**
 * Max width variants for PageSheet / PageForm.
 */
export type PageSheetMaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";

/**
 * Props for PageSheet (Odoo-style <sheet> container).
 */
export interface PageSheetProps extends React.ComponentPropsWithoutRef<"div"> {
  maxWidth?: PageSheetMaxWidth;
  elevation?: "none" | "xs" | "sm" | "md" | "lg";
  headerSlot?: React.ReactNode;
}

/**
 * Props for PageFormHeader.
 */
export interface PageFormHeaderProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  avatar?: React.ReactNode;
  buttonBox?: React.ReactNode;
}

/**
 * Props for PageStatBox (Odoo oe_button_box).
 */
export interface PageStatBoxProps extends React.ComponentPropsWithoutRef<"div"> {}

/**
 * Props for PageStatButton.
 */
export interface PageStatButtonProps extends Omit<React.ComponentPropsWithoutRef<"button">, "value"> {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  value?: React.ReactNode;
  label: React.ReactNode;
  badge?: React.ReactNode;
  active?: boolean;
  href?: string;
}

/**
 * Item descriptor for tabs in PageNotebook / PageTabs.
 */
export interface PageTabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  content?: React.ReactNode;
}

/**
 * Props for PageNotebook (Odoo <notebook>) and PageTabs.
 */
export interface PageNotebookProps extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange"> {
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  syncUrl?: boolean;
  paramKey?: string;
  variant?: "default" | "line";
  tabs?: PageTabItem[];
  tabsListClassName?: string;
  children?: React.ReactNode;
}

/**
 * Props for PageNotebookTab (Odoo <page> inside <notebook>) and PageTab.
 */
export interface PageNotebookTabProps extends React.ComponentPropsWithoutRef<"div"> {
  id: string;
  label?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
}

export type PageTabsProps = PageNotebookProps;
export type PageTabProps = PageNotebookTabProps;

/**
 * Props for PageFieldGroup (Odoo <group>).
 */
export interface PageFieldGroupProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title?: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

/**
 * Props for PageField (Odoo <field>).
 */
export interface PageFieldProps extends React.ComponentPropsWithoutRef<"div"> {
  label?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  help?: React.ReactNode;
  orientation?: "horizontal" | "vertical";
}

/**
 * Trend definition for PageDashboardKpi.
 */
export interface PageDashboardKpiTrend {
  value: number | string;
  direction?: "up" | "down" | "neutral";
  isPositive?: boolean;
}

/**
 * Props for PageDashboardKpi metric card.
 */
export interface PageDashboardKpiProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  trend?: PageDashboardKpiTrend;
  badge?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Props for PageDashboard grid container.
 */
export interface PageDashboardProps extends React.ComponentPropsWithoutRef<"div"> {
  cols?: 1 | 2 | 3 | 4 | "auto";
  gap?: "sm" | "default" | "lg";
}

/**
 * Props for PageDashboardSection card group.
 */
export interface PageDashboardSectionProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Event item for PageCalendar.
 */
export interface PageCalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  endDate?: Date | string;
  badge?: React.ReactNode;
  color?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "info";
  data?: unknown;
}

/**
 * View mode for PageCalendar (month, week, day).
 */
export type PageCalendarViewMode = "month" | "week" | "day";

/**
 * Props for PageCalendar.
 */
export interface PageCalendarProps<T extends PageCalendarEvent = PageCalendarEvent>
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onSelect"> {
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  events?: T[];
  onEventClick?: (event: T) => void;
  onDateClick?: (date: Date) => void;
  viewMode?: PageCalendarViewMode;
  onViewModeChange?: (mode: PageCalendarViewMode) => void;
  renderEvent?: (event: T) => React.ReactNode;
}

/**
 * Graph chart display types.
 */
export type PageGraphType = "bar" | "line" | "donut";

/**
 * Data item for PageGraph.
 */
export interface PageGraphDataPoint {
  label: string;
  value: number;
  color?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
}

/**
 * Props for PageGraph.
 */
export interface PageGraphProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  data: PageGraphDataPoint[];
  type?: PageGraphType;
  defaultType?: PageGraphType;
  onTypeChange?: (type: PageGraphType) => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
  allowTypeChange?: boolean;
  actions?: React.ReactNode;
}
