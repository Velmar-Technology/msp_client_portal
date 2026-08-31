import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ViewToggleOption<T extends string = string> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title?: string;
  ariaLabel?: string;
  className?: string;
}

export interface ViewToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options?: ViewToggleOption<T>[];
  size?: "sm" | "default" | "lg";
  className?: string;
  "aria-label"?: string;
}

/**
 * Standard View Mode Toggle primitive component.
 * Supports icon-only buttons (e.g. grid vs list) as well as labeled views (e.g. table vs kanban).
 */
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  size = "default",
  className,
  "aria-label": ariaLabel = "View mode toggle",
}: ViewToggleProps<T>) {
  const { t } = useTranslation();

  // Standard fallback default options for tiled / list
  const resolvedOptions: ViewToggleOption<T>[] = React.useMemo(() => {
    if (options && options.length > 0) {
      return options;
    }
    return [
      {
        value: "tiled" as T,
        icon: LayoutGrid,
        title: t("resources.viewTiled", "Tiled"),
        ariaLabel: t("resources.viewTiled", "Tiled"),
      },
      {
        value: "list" as T,
        icon: List,
        title: t("resources.viewList", "List"),
        ariaLabel: t("resources.viewList", "List"),
      },
    ];
  }, [options, t]);

  const sizeClasses = {
    sm: "h-7",
    default: "h-8",
    lg: "h-9",
  }[size];

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    default: "h-4 w-4",
    lg: "h-4.5 w-4.5",
  }[size];

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-center bg-muted p-0.5 rounded-md border border-border shrink-0", className)}
    >
      {resolvedOptions.map((opt) => {
        const isSelected = value === opt.value;
        const Icon = opt.icon;

        return (
          <Button
            key={opt.value}
            type="button"
            variant={isSelected ? "secondary" : "ghost"}
            size={
              opt.label
                ? size === "sm"
                  ? "sm"
                  : size === "lg"
                    ? "lg"
                    : "default"
                : size === "sm"
                  ? "icon-sm"
                  : size === "lg"
                    ? "icon-lg"
                    : "icon"
            }
            onClick={() => onChange(opt.value)}
            title={opt.title || (typeof opt.label === "string" ? opt.label : undefined)}
            aria-label={opt.ariaLabel || opt.title || (typeof opt.label === "string" ? opt.label : opt.value)}
            aria-pressed={isSelected}
            data-state={isSelected ? "on" : "off"}
            className={cn(
              sizeClasses,
              !opt.label && (size === "sm" ? "w-7" : size === "lg" ? "w-9" : "w-8"),
              "rounded cursor-pointer transition-all",
              opt.label && "px-2.5 gap-1.5 text-xs font-semibold",
              isSelected && "bg-card text-foreground shadow-xs",
              opt.className,
            )}
          >
            {Icon &&
              (React.isValidElement(Icon) ? (
                Icon
              ) : (
                React.createElement(Icon as React.ComponentType<{ className?: string }>, {
                  className: iconSizes,
                })
              ))}
            {opt.label && <span>{opt.label}</span>}
          </Button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
