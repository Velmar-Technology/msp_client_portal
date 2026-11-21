import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageTogglePillProps {
  label: string;
  active: boolean;
  onToggle: (nextState: boolean) => void;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * Toggle pill button for binary filter conditions.
 */
export function PageTogglePill({
  label,
  active,
  onToggle,
  count,
  icon: Icon,
  className,
}: PageTogglePillProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer shadow-2xs select-none",
        active
          ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-border/80 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 hover:border-border",
        className
      )}
      data-testid="page-toggle-pill"
      data-active={active}
      aria-pressed={active}
    >
      {active && <Check className="size-3 text-primary shrink-0" />}
      {!active && Icon && <Icon className="size-3 text-muted-foreground shrink-0" />}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono",
            active
              ? "bg-primary/20 text-primary font-semibold"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export { PageTogglePill as TogglePill };
