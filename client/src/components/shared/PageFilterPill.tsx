import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FilterOption {
  value: string;
  label: string;
}

export interface PageFilterPillProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  onClear: () => void;
}

/**
 * ElevenLabs-style "+ Filter" pill button with popover picker and active tag state.
 *
 * @param props - PageFilterPillProps
 * @returns JSX.Element
 */
export function PageFilterPill({
  label,
  value,
  options,
  onChange,
  onClear,
}: PageFilterPillProps) {
  const [open, setOpen] = useState(false);

  const isActive = Boolean(value && value !== "ALL" && value !== "all");
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {isActive ? (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-medium cursor-pointer shadow-2xs hover:bg-primary/15 transition-colors"
            data-testid={`filter-pill-active-${label.toLowerCase()}`}
          >
            <span>
              {label}: <strong className="font-semibold">{displayLabel}</strong>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="size-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label={`Clear ${label} filter`}
            >
              <X className="size-2.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/80 bg-background/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-2xs"
            data-testid={`filter-pill-${label.toLowerCase()}`}
          >
            <Plus className="size-3 text-muted-foreground/70" />
            <span>{label}</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-48 p-1">
        <div className="space-y-0.5" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="size-3 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
