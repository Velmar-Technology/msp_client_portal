import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUrlState } from "@/hooks/useUrlState";

export interface PageShellTabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export type PageShellVariant = "constrained" | "narrow" | "full";

export interface PageShellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Page title */
  title?: React.ReactNode;
  /** Subtitle or description beneath title */
  subtitle?: React.ReactNode;
  /** Optional badge next to title */
  badge?: React.ReactNode;
  /** Back navigation: path string or true for browser back */
  backPath?: string | boolean;
  /** Optional text label next to the back arrow */
  backLabel?: React.ReactNode;
  /** Explicit back button click handler */
  onBack?: () => void;
  /** Primary call-to-action button */
  cta?: React.ReactNode;
  /** Secondary actions or toolbar controls */
  actions?: React.ReactNode;
  /** Additional items rendered inside the header row */
  headerChildren?: React.ReactNode;
  /** Horizontal sub-navigation tabs */
  tabs?: PageShellTabItem[];
  /** Controlled active tab id */
  activeTab?: string;
  /** Default active tab id when uncontrolled */
  defaultTab?: string;
  /** Tab change callback */
  onTabChange?: (tabId: string) => void;
  /** Synchronize active tab with URL query parameter */
  syncUrl?: boolean;
  /** URL query param key for tab synchronization (default: "tab") */
  tabParamKey?: string;
  /** Whether the header has a sticky top position with glassmorphism */
  stickyHeader?: boolean;
  /** Whether the header renders a subtle bottom border divider */
  borderedHeader?: boolean;
  /** Content width variant: "constrained" (max-w-4xl), "narrow" (max-w-3xl), "full" (max-w-full) */
  variant?: PageShellVariant;
  /** Additional styling classes for the header container */
  headerClassName?: string;
  /** Additional styling classes for the main content container */
  contentClassName?: string;
}

/**
 * Enterprise PageShell component adapted from Cal.com UI architecture.
 * Enforces unified max-width columns, non-expanding horizontal sub-navigation,
 * hairline borders, and clean anti-card content rhythms.
 *
 * @param props - PageShellProps
 * @returns React.ReactElement
 */
export function PageShell({
  title,
  subtitle,
  badge,
  backPath,
  backLabel,
  onBack,
  cta,
  actions,
  headerChildren,
  tabs,
  activeTab: controlledTab,
  defaultTab,
  onTabChange,
  syncUrl = false,
  tabParamKey = "tab",
  stickyHeader = false,
  borderedHeader = true,
  variant = "constrained",
  className,
  headerClassName,
  contentClassName,
  children,
  ...props
}: PageShellProps) {
  const navigate = useNavigate();
  const { getParam, setParam } = useUrlState();

  // Internal tab state management
  const initialTab = React.useMemo(() => {
    if (controlledTab !== undefined) return controlledTab;
    if (syncUrl) {
      const urlTab = getParam(tabParamKey);
      if (urlTab) return urlTab;
    }
    return defaultTab ?? tabs?.[0]?.id ?? "";
  }, [controlledTab, defaultTab, getParam, syncUrl, tabParamKey, tabs]);

  const [currentTab, setCurrentTab] = React.useState<string>(initialTab);

  // Sync external controlled state
  React.useEffect(() => {
    if (controlledTab !== undefined && controlledTab !== currentTab) {
      setCurrentTab(controlledTab);
    }
  }, [controlledTab, currentTab]);

  // Sync with URL parameter
  React.useEffect(() => {
    if (syncUrl) {
      const urlTab = getParam(tabParamKey);
      if (urlTab && urlTab !== currentTab) {
        setCurrentTab(urlTab);
      }
    }
  }, [getParam, syncUrl, tabParamKey, currentTab]);

  const handleTabSelect = React.useCallback(
    (tabId: string) => {
      if (controlledTab === undefined) {
        setCurrentTab(tabId);
      }
      if (syncUrl) {
        setParam(tabParamKey, tabId);
      }
      onTabChange?.(tabId);
    },
    [controlledTab, syncUrl, setParam, tabParamKey, onTabChange]
  );

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
    } else if (typeof backPath === "string") {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  }, [navigate, onBack, backPath]);

  const showBackButton = Boolean(backPath || onBack);
  const hasHeaderContent = Boolean(
    title || subtitle || badge || showBackButton || cta || actions || headerChildren
  );

  // Width variant mapping
  const widthClasses = {
    constrained: "max-w-4xl mx-auto w-full",
    narrow: "max-w-3xl mx-auto w-full",
    full: "w-full max-w-full",
  }[variant];

  return (
    <div
      data-slot="page-shell"
      data-variant={variant}
      className={cn("w-full flex-1 flex flex-col min-h-0", className)}
      {...props}
    >
      <div className={cn(widthClasses, "space-y-6")}>
        {hasHeaderContent && (
          <header
            data-slot="page-shell-header"
            className={cn(
              "w-full space-y-3 pt-1 transition-all",
              borderedHeader && "border-b border-border/50 pb-4",
              stickyHeader &&
                "sticky top-0 z-20 backdrop-blur-md bg-background/85 -mx-4 px-4 sm:-mx-6 sm:px-6",
              headerClassName
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {showBackButton && (
                  <Button
                    type="button"
                    variant="minimal"
                    size={backLabel ? "sm" : "icon-sm"}
                    onClick={handleBack}
                    aria-label={typeof backLabel === "string" ? backLabel : "Go back"}
                    className={cn(
                      "shrink-0 rounded-md -ml-1 text-muted-foreground hover:text-foreground",
                      backLabel ? "h-7 px-2 gap-1.5 text-xs font-semibold" : ""
                    )}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel && <span>{backLabel}</span>}
                  </Button>
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {title && (
                      <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground font-heading truncate">
                        {title}
                      </h1>
                    )}
                    {badge && <div className="shrink-0">{badge}</div>}
                  </div>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {(cta || actions) && (
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {actions}
                  {cta}
                </div>
              )}
            </div>

            {headerChildren}
          </header>
        )}

        {tabs && tabs.length > 0 && (
          <nav
            data-slot="page-shell-tabs"
            aria-label="Sub navigation tabs"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
          >
            {tabs.map((tab) => {
              const isCurrent = (currentTab || tabs[0]?.id) === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  disabled={tab.disabled}
                  onClick={() => handleTabSelect(tab.id)}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      handleTabSelect(tab.id);
                    }
                  }}
                  className={cn(
                    "flex-none shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer select-none",
                    isCurrent
                      ? "bg-secondary text-foreground shadow-subtle font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                    tab.disabled && "pointer-events-none opacity-40 cursor-not-allowed"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span>{tab.label}</span>
                  {tab.badge && <span className="ml-0.5">{tab.badge}</span>}
                </button>
              );
            })}
          </nav>
        )}

        <main
          data-slot="page-shell-content"
          className={cn("w-full min-w-0 space-y-6 pb-8", contentClassName)}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// Compound subcomponents for maximum composition flexibility
export function PageShellHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-3 w-full pb-4 border-b border-border/50", className)} {...props}>
      {children}
    </div>
  );
}

export function PageShellTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("text-lg sm:text-xl font-semibold tracking-tight text-foreground font-heading", className)} {...props}>
      {children}
    </h1>
  );
}

export function PageShellDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs sm:text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

export function PageShellActions({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)} {...props}>
      {children}
    </div>
  );
}

PageShell.Header = PageShellHeader;
PageShell.Title = PageShellTitle;
PageShell.Description = PageShellDescription;
PageShell.Actions = PageShellActions;
