import * as React from "react";
import { useInRouterContext } from "react-router-dom";
import { List, LayoutGrid, LayoutDashboard, Calendar, BarChart2, FileText } from "lucide-react";
import { useUrlState } from "@/hooks/useUrlState";
import type {
  PageContextValue,
  PageViewOption,
  PageProviderProps,
  UsePageViewOptions,
} from "./types";

export const STANDARD_VIEW_DEFINITIONS: Record<string, PageViewOption<string>> = {
  list: { value: "list", label: "List", title: "List view", icon: List },
  kanban: { value: "kanban", label: "Kanban", title: "Kanban view", icon: LayoutGrid },
  form: { value: "form", label: "Form", title: "Form view", icon: FileText },
  dashboard: { value: "dashboard", label: "Dashboard", title: "Dashboard view", icon: LayoutDashboard },
  calendar: { value: "calendar", label: "Calendar", title: "Calendar view", icon: Calendar },
  graph: { value: "graph", label: "Graph", title: "Graph view", icon: BarChart2 },
};

const DEFAULT_VIEWS: PageViewOption<string>[] = [
  STANDARD_VIEW_DEFINITIONS.list,
  STANDARD_VIEW_DEFINITIONS.kanban,
];

const PageContext = React.createContext<PageContextValue<any> | null>(null);

/**
 * Access the active PageContext state and actions.
 * Throws a helpful error if accessed outside a PageProvider.
 */
export function usePageContext<T extends string = string>(): PageContextValue<T> {
  const context = React.useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used within a PageProvider or <Page> compound component");
  }
  return context as PageContextValue<T>;
}

/**
 * Headless hook to manage Odoo-inspired view controller state.
 */
export function usePageView<T extends string = string>(
  options: UsePageViewOptions<T> = {}
): PageContextValue<T> {
  const {
    activeView: controlledActiveView,
    onViewChange,
    defaultView = "list" as T,
    availableViews = DEFAULT_VIEWS as PageViewOption<T>[],
    defaultPage = 1,
    defaultPageSize = 25,
    totalCount: initialTotalCount,
    isLoading = false,
  } = options;

  const [uncontrolledActiveView, setUncontrolledActiveView] = React.useState<T>(defaultView);
  const [views, setViews] = React.useState<PageViewOption<T>[]>(availableViews);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(defaultPage);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  const [totalCount, setTotalCount] = React.useState<number | undefined>(initialTotalCount);

  const activeView = controlledActiveView !== undefined ? controlledActiveView : uncontrolledActiveView;

  const setActiveView = React.useCallback(
    (view: T) => {
      setUncontrolledActiveView(view);
      onViewChange?.(view);
    },
    [onViewChange]
  );

  // Sync availableViews if prop changes
  React.useEffect(() => {
    if (availableViews && availableViews.length > 0) {
      setViews(availableViews);
    }
  }, [availableViews]);

  return React.useMemo(
    () => ({
      activeView,
      setActiveView,
      availableViews: views,
      setAvailableViews: setViews,
      searchQuery,
      setSearchQuery,
      page,
      setPage,
      pageSize,
      setPageSize,
      totalCount,
      setTotalCount,
      isLoading,
    }),
    [activeView, setActiveView, views, searchQuery, page, pageSize, totalCount, isLoading]
  );
}

interface ActiveUrlBridgeProps<T extends string = string> {
  viewParamKey: string;
  searchParamKey: string;
  pageParamKey: string;
  pageSizeParamKey: string;
  activeView: T;
  setActiveView: (view: T) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
}

function ActiveUrlBridge<T extends string = string>({
  viewParamKey,
  searchParamKey,
  pageParamKey,
  pageSizeParamKey,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  page,
  setPage,
  pageSize,
  setPageSize,
}: ActiveUrlBridgeProps<T>) {
  const { getParam, getNumberParam, setParam } = useUrlState();
  const isInitialMount = React.useRef(true);

  const hasHydrated = React.useRef(false);

  // 1. Initial hydration from URL params (mount only)
  React.useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const urlView = getParam(viewParamKey) as T;
    if (urlView && urlView !== activeView) {
      setActiveView(urlView);
    }

    const urlSearch = getParam(searchParamKey);
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }

    const urlPage = getNumberParam(pageParamKey, 0);
    if (urlPage > 0 && urlPage !== page) {
      setPage(urlPage);
    }

    const urlPageSize = getNumberParam(pageSizeParamKey, 0);
    if (urlPageSize > 0 && urlPageSize !== pageSize) {
      setPageSize(urlPageSize);
    }
  }, [hasHydrated, activeView, getNumberParam, getParam, page, pageParamKey, pageSize, pageSizeParamKey, searchParamKey, searchQuery, setActiveView, setPage, setPageSize, setSearchQuery, viewParamKey]);

  // 2. Sync state updates back to URL
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentUrlView = getParam(viewParamKey);
    if (activeView && activeView !== currentUrlView) {
      setParam(viewParamKey, activeView);
    }
  }, [activeView, viewParamKey, getParam, setParam]);

  React.useEffect(() => {
    if (isInitialMount.current) return;
    const currentUrlSearch = getParam(searchParamKey);
    if (searchQuery !== currentUrlSearch) {
      setParam(searchParamKey, searchQuery || null);
    }
  }, [searchQuery, searchParamKey, getParam, setParam]);

  React.useEffect(() => {
    if (isInitialMount.current) return;
    const currentUrlPage = getNumberParam(pageParamKey, 1);
    if (page !== currentUrlPage) {
      setParam(pageParamKey, page === 1 ? null : page);
    }
  }, [page, pageParamKey, getNumberParam, setParam]);

  return null;
}

function PageUrlBridge<T extends string = string>(props: ActiveUrlBridgeProps<T> & { syncUrl?: boolean }) {
  const inRouter = useInRouterContext();
  if (!inRouter || props.syncUrl === false) {
    return null;
  }
  return <ActiveUrlBridge {...props} />;
}

/**
 * Provider component supplying PageContext to compound children.
 */
export function PageProvider<T extends string = string>({
  children,
  controller,
  activeView,
  onViewChange,
  defaultView = "list" as T,
  availableViews = DEFAULT_VIEWS as PageViewOption<T>[],
  syncUrl = true,
  viewParamKey = "view",
  searchParamKey = "q",
  pageParamKey = "page",
  pageSizeParamKey = "limit",
  defaultPage = 1,
  defaultPageSize = 25,
  totalCount,
  isLoading,
}: PageProviderProps<T>) {
  const localController = usePageView<T>({
    activeView,
    onViewChange,
    defaultView,
    availableViews,
    defaultPage,
    defaultPageSize,
    totalCount,
    isLoading,
  });

  const activeController = controller ?? localController;

  return (
    <PageContext.Provider value={activeController}>
      <PageUrlBridge
        syncUrl={syncUrl}
        viewParamKey={viewParamKey}
        searchParamKey={searchParamKey}
        pageParamKey={pageParamKey}
        pageSizeParamKey={pageSizeParamKey}
        activeView={activeController.activeView}
        setActiveView={activeController.setActiveView}
        searchQuery={activeController.searchQuery}
        setSearchQuery={activeController.setSearchQuery}
        page={activeController.page}
        setPage={activeController.setPage}
        pageSize={activeController.pageSize}
        setPageSize={activeController.setPageSize}
      />
      {children}
    </PageContext.Provider>
  );
}

export { PageContext };
