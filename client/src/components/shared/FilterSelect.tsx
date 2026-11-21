import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterSelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
}

/**
 * High-density Cal-style FilterSelect component.
 * Standard h-7 (28px) trigger with hairline borders and subtle hover state.
 *
 * @param props - FilterSelectProps
 * @returns React.ReactElement
 * @see Cal.com filter-select
 */
export function FilterSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Filter...",
  icon: Icon,
  disabled = false,
  className,
}: FilterSelectProps) {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        data-slot="filter-select-trigger"
        className={cn(
          "h-7 text-xs px-2.5 gap-1.5 rounded-md border-border/70 bg-background hover:bg-muted/50 transition-colors shadow-subtle min-w-[120px] sm:min-w-[140px]",
          className
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="text-xs">
        {options.map((opt) => {
          const ItemIcon = opt.icon;
          return (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              <div className="flex items-center gap-2">
                {ItemIcon && <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span>{opt.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
