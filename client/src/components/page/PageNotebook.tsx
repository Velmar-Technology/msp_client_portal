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
 * Enterprise Odoo-inspired Notebook container (`<notebook>`).
 * Organizes sub-views, details, logs, and telemetry into tabbed pages.
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
  children,
  className,
  ...props
}: PageNotebookProps) {
  // Extract tabs from valid React children
  const tabChildren = React.useMemo(() => {
    const tabs: Array<{
      id: string;
      label: React.ReactNode;
      icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
      badge?: React.ReactNode;
      disabled?: boolean;
      element: React.ReactElement<PageNotebookTabProps>;
    }> = [];

    React.Children.forEach(children, (child) => {
      if (React.isValidElement<PageNotebookTabProps>(child) && child.props.id) {
        tabs.push({
          id: child.props.id,
          label: child.props.label,
          icon: child.props.icon,
          badge: child.props.badge,
          disabled: child.props.disabled,
          element: child,
        });
      }
    });

    return tabs;
  }, [children]);

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
          className="border-b border-border/60 w-full justify-start rounded-none bg-transparent p-0 h-9 gap-2"
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
                  "h-8 px-3 text-xs font-semibold rounded-none border-b-2 border-transparent transition-all",
                  "data-active:border-primary data-active:text-primary data-active:bg-transparent",
                  "hover:text-foreground cursor-pointer select-none"
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

        {tabChildren.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-3 focus-visible:outline-none">
            {tab.element}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
