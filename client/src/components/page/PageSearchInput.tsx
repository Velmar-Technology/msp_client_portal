import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * ElevenLabs-style full-width rounded search input with embedded icon and quick clear action.
 *
 * @param props - PageSearchInputProps
 * @returns JSX.Element
 */
export function PageSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: PageSearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl border border-border/70 bg-background/50 pl-10 pr-9 text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-ring focus:border-ring transition-all shadow-2xs"
        data-testid="page-search-input"
        data-slot="page-search-input"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 size-4 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
