import * as React from "react";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PageContext } from "./PageContext";
import type { PageViewSwitcherProps, PageContextValue } from "./types";

/**
 * Compact segmented view switcher adhering to the 28px (h-7) control standard.
 * Automatically consumes PageContext activeView and availableViews if not passed explicitly.
 */
export function PageViewSwitcher<T extends string = string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
  "aria-label": ariaLabel = "Page view mode switcher",
}: PageViewSwitcherProps<T>) {
  const context = React.useContext(PageContext) as PageContextValue<T> | null;

  const resolvedValue = value ?? (context?.activeView as T) ?? ("list" as T);
  const resolvedOnChange = onChange ?? (context?.setActiveView as (v: T) => void) ?? (() => {});
  const resolvedOptions = options ?? context?.availableViews ?? [];

  if (!resolvedOptions || resolvedOptions.length <= 1) {
    return null;
  }

  return (
    <ViewToggle<T>
      value={resolvedValue}
      onChange={resolvedOnChange}
      options={resolvedOptions}
      size={size}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
