import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/useUrlState";
import { cn } from "@/lib/utils";
import type { PageNotebookProps, PageNotebookTabProps } from "./types";

/**
 * Enterprise Odoo-inspired Notebook Tab (`<page string="...">`).
 * Defines an individual page within a PageNotebook.
 *
 * @param props - Configuration and children for the tab content.
 * @returns Tab panel element.
 */
export function PageNotebookTab({ children, className, ...props }: PageNotebookTabProps) {
  return (
    <div className={cn("pt-2", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Internal component to handle optional URL query parameter synchronization.
 */
function PageNotebookUrlBridge({
  paramKey,
  currentTab,
  onTabSelect,
}: {
  paramKey: string;
  currentTab: string;
  onTabSelect: (tab: string) => void;
}) {
  const { getParam, setParam } = useUrlState();
  const urlTab = getParam(paramKey);

  React.useEffect(() => {
    if (urlTab && urlTab !== currentTab) {
      onTabSelect(urlTab);
    }
  }, [urlTab, currentTab, onTabSelect]);

  React.useEffect(() => {
    if (currentTab && (!urlTab || urlTab !== currentTab)) {
      setParam(paramKey, currentTab);
    }
  }, [currentTab, urlTab, paramKey, setParam]);

  return null;
}

/**
 * Enterprise Odoo-inspired Notebook container (`<notebook>`) and Tabbed Page container.
 * Organizes sub-views, details, logs, and telemetry into tabbed pages.
 * Also exported as PageTabs.
 *
 * @param props - Configuration for the notebook container.
 * @returns Tabbed notebook component.
 */
export function PageNotebook({
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  syncUrl = false,
  paramKey = "tab",
  variant = "line",
  tabs: tabsProp,
  tabsListClassName,
  children,
  className,
  ...props
}: PageNotebookProps) {
  // Extract tabs from props.tabs or valid React children
  const tabChildren = React.useMemo(() => {
    const list: Array<{
      id: string;
      label: React.ReactNode;
      icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
      badge?: React.ReactNode;
      disabled?: boolean;
      content?: React.ReactNode;
    }> = [];

    // 1. Process tabs from props array if provided
    if (tabsProp && tabsProp.length > 0) {
      tabsProp.forEach((t) => {
        list.push({
          id: t.id,
          label: t.label,
          icon: t.icon,
          badge: t.badge,
          disabled: t.disabled,
          content: t.content,
        });
      });
    }

    // 2. Process tabs from JSX children
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<PageNotebookTabProps>(child) && child.props.id) {
        list.push({
          id: child.props.id,
          label: child.props.label,
          icon: child.props.icon,
          badge: child.props.badge,
          disabled: child.props.disabled,
          content: child.props.children,
        });
      }
    });

    return list;
  }, [tabsProp, children]);

  const initialTab = defaultTab || (tabChildren.length > 0 ? tabChildren[0].id : "");
  const [internalTab, setInternalTab] = React.useState<string>(initialTab);

  const isControlled = controlledTab !== undefined;
  const currentTab = isControlled ? controlledTab : internalTab;

  const handleTabChange = React.useCallback(
    (newTab: string) => {
      if (!isControlled) {
        setInternalTab(newTab);
      }
      onTabChange?.(newTab);
    },
    [isControlled, onTabChange]
  );

  return (
    <div data-slot="page-notebook" className={cn("w-full space-y-4", className)} {...props}>
      {syncUrl && (
        <PageNotebookUrlBridge
          paramKey={paramKey}
          currentTab={currentTab}
          onTabSelect={handleTabChange}
        />
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          variant={variant}
          className={cn(
            variant === "line"
              ? "border-b border-border/60 w-full justify-start rounded-none bg-transparent p-0 h-9 gap-2"
              : "h-8 bg-muted p-0.5 rounded-md",
            tabsListClassName
          )}
        >
          {tabChildren.map((tab) => {
            const Icon = tab.icon;
            const isIconComponent =
              typeof Icon === "function" ||
              (typeof Icon === "object" && Icon !== null && !React.isValidElement(Icon));

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  variant === "line"
                    ? "h-8 px-3 text-xs font-semibold rounded-none border-b-2 border-transparent transition-all data-active:border-primary data-active:text-primary data-active:bg-transparent hover:text-foreground cursor-pointer select-none"
                    : "h-7 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer select-none"
                )}
              >
                {Icon && (
                  <span className="shrink-0 mr-1.5">
                    {isIconComponent ? (
                      React.createElement(Icon as React.ComponentType<{ className?: string }>, {
                        className: "size-3.5",
                      })
                    ) : (
                      Icon
                    )}
                  </span>
                )}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== null && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground text-[10px] font-mono font-medium">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabChildren.map((tab) => {
          if (!tab.content) return null;
          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-3 focus-visible:outline-none">
              {tab.content}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/**
 * Modern alias for PageNotebook.
 */
export const PageTabs = PageNotebook;

/**
 * Modern alias for PageNotebookTab.
 */
export const PageTab = PageNotebookTab;
