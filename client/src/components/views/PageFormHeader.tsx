import { cn } from "@/lib/utils";
import type { PageFormHeaderProps } from "./types";

/**
 * Enterprise Odoo-inspired Form Header (`oe_title`).
 * Provides a designated header block inside or above a Sheet, containing
 * the record title, subtitle metadata, badges, and the smart button box (`oe_button_box`).
 *
 * @param props - Configuration for the form header block.
 * @returns Slotted header component for form views.
 */
export function PageFormHeader({
  title,
  subtitle,
  badges,
  avatar,
  buttonBox,
  className,
  children,
  ...props
}: PageFormHeaderProps) {
  return (
    <header
      data-slot="page-form-header"
      className={cn(
        "flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-border/60",
        className
      )}
      {...props}
    >
      {/* Title, Subtitle, Badges & Avatar (Left) */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {avatar && <div className="shrink-0 mt-0.5">{avatar}</div>}
        <div className="space-y-1.5 min-w-0 flex-1">
          {title && (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading break-words">
              {title}
            </h1>
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {badges && <div className="flex items-center gap-1.5 flex-wrap">{badges}</div>}
            {subtitle && <div className="font-medium text-muted-foreground">{subtitle}</div>}
          </div>

          {children}
        </div>
      </div>

      {/* Button Box / Smart Stat Buttons (Right) */}
      {buttonBox && <div className="shrink-0 self-start md:self-auto">{buttonBox}</div>}
    </header>
  );
}
