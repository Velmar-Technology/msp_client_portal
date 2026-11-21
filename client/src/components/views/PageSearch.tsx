import * as React from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageContext } from "./PageContext";
import type { PageSearchProps } from "./types";

/**
 * Compact Odoo-inspired search bar with debounced updates, clear button,
 * keyboard shortcut integration (/ to focus), and optional active filter chips.
 */
export function PageSearch({
  value: propValue,
  onChange: propOnChange,
  onClear: propOnClear,
  debounceMs = 300,
  filterChips = [],
  onRemoveChip,
  placeholder,
  shortcutHint = true,
  className,
  ...props
}: PageSearchProps) {
  const { t } = useTranslation();
  const context = React.useContext(PageContext);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const contextValue = context?.searchQuery ?? "";
  const contextOnChange = context?.setSearchQuery;

  const resolvedValue = propValue !== undefined ? propValue : contextValue;
  const resolvedOnChange = propOnChange ?? contextOnChange;

  const [localValue, setLocalValue] = React.useState(resolvedValue);

  // Sync external value changes to local input
  React.useEffect(() => {
    setLocalValue(resolvedValue);
  }, [resolvedValue]);

  // Debounced propagation to external/context handler
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== resolvedValue && resolvedOnChange) {
        resolvedOnChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localValue, resolvedValue, resolvedOnChange, debounceMs]);

  // Global hotkey: press '/' to focus search input
  React.useEffect(() => {
    if (!shortcutHint) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement !== inputRef.current &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement?.tagName || "").toUpperCase())
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutHint]);

  const handleClear = () => {
    setLocalValue("");
    if (resolvedOnChange) {
      resolvedOnChange("");
    }
    if (propOnClear) {
      propOnClear();
    }
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-1.5 min-w-0 max-w-md w-full", className)}>
      <div className="relative flex items-center w-full">
        <Search className="absolute left-2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder || t("common.search", "Search...")}
          className={cn("h-7 pl-7 pr-12 text-xs bg-background/50 focus-visible:bg-background")}
          {...props}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {localValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={t("common.clear", "Clear search")}
              aria-label={t("common.clear", "Clear search")}
            >
              <X className="size-3" />
            </button>
          ) : shortcutHint ? (
            <kbd className="hidden sm:inline-flex items-center px-1 text-[10px] font-mono text-muted-foreground bg-muted/60 rounded border border-border/60 pointer-events-none select-none">
              /
            </kbd>
          ) : null}
        </div>
      </div>

      {filterChips && filterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {filterChips.map((chip) => (
            <Badge
              key={chip.id}
              variant="secondary"
              className="h-5 px-1.5 text-[11px] gap-1 font-normal bg-muted/80 text-foreground border border-border/50"
            >
              <span>{chip.label}</span>
              {chip.value && <span className="font-semibold text-primary">{chip.value}</span>}
              <button
                type="button"
                onClick={() => {
                  chip.onRemove?.();
                  onRemoveChip?.(chip.id);
                }}
                className="p-0.5 hover:text-destructive cursor-pointer rounded-xs"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
