import * as React from "react";
import { cn } from "@/lib/utils";

export interface HorizontalTabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface HorizontalTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: HorizontalTabItem[];
  activeTab?: string;
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

/**
 * Standardized Cal.com horizontal pill tabs navigation.
 * Non-expanding pills, single-row touch scroll, subtle active elevation.
 *
 * @param props - HorizontalTabsProps
 * @returns React.ReactElement
 * @see Cal.com HorizontalTabs.tsx
 */
export function HorizontalTabs({
  tabs,
  activeTab: controlledTab,
  defaultTab,
  onTabChange,
  className,
  ...props
}: HorizontalTabsProps) {
  const [internalTab, setInternalTab] = React.useState(defaultTab || tabs[0]?.id || "");
  const currentTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleSelect = (tabId: string) => {
    if (controlledTab === undefined) {
      setInternalTab(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <div className={cn("w-full overflow-hidden", className)} {...props}>
      <nav
        role="tablist"
        aria-label="Tabs"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
      >
        {tabs.map((tab) => {
          const isCurrent = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              disabled={tab.disabled}
              onClick={() => handleSelect(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 0) handleSelect(tab.id);
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
    </div>
  );
}
