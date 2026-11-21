export * from "./types";
export * from "./PageContext";
export * from "./PageView";
export * from "./PageViewSwitcher";
export * from "./PageControlPanel";
export * from "./PageCalendar";
export * from "./PageGraph";
export * from "./PageDashboard";
export * from "./PageSearch";
export * from "./PagePager";
export * from "./PageStatusBar";
export * from "./PageFormHeader";
export * from "./PageStatButton";

// Aliases for modern naming
export { PageCalendar as CalendarView } from "./PageCalendar";
export { PageGraph as GraphView } from "./PageGraph";
export { PageDashboard as DashboardGrid, PageDashboardKpi as DashboardKpi } from "./PageDashboard";
export { PageView as View } from "./PageView";
export { PageViewSwitcher as ViewSwitcher } from "./PageViewSwitcher";
