import { cn } from "@/lib/utils";
import type { PageSheetProps, PageSheetMaxWidth } from "./types";

const maxWidthClasses: Record<PageSheetMaxWidth, string> = {
  sm: "max-w-screen-sm mx-auto",
  md: "max-w-screen-md mx-auto",
  lg: "max-w-screen-lg mx-auto",
  xl: "max-w-screen-xl mx-auto",
  "2xl": "max-w-2xl mx-auto",
  "3xl": "max-w-3xl mx-auto",
  "4xl": "max-w-4xl mx-auto",
  "5xl": "max-w-5xl mx-auto",
  "6xl": "max-w-6xl mx-auto",
  "7xl": "max-w-7xl mx-auto",
  full: "w-full",
};

const elevationClasses = {
  none: "shadow-none",
  xs: "shadow-2xs",
  sm: "shadow-xs",
  md: "shadow-sm",
  lg: "shadow-md",
};

/**
 * Enterprise Odoo-inspired Sheet container (<sheet>).
 * Acts as an elevated document paper container for record forms,
 * detail views, and sub-sheets.
 *
 * @param props - Configuration and children for the sheet container.
 * @returns React component representing the record document sheet.
 */
export function PageSheet({
  maxWidth = "full",
  elevation = "xs",
  headerSlot,
  children,
  className,
  ...props
}: PageSheetProps) {
  return (
    <article
      data-slot="page-sheet"
      className={cn(
        "bg-card text-card-foreground border border-border/80 rounded-lg p-5 sm:p-7 space-y-6 relative transition-all",
        maxWidthClasses[maxWidth],
        elevationClasses[elevation],
        className
      )}
      {...props}
    >
      {headerSlot && <div className="border-b border-border/60 pb-4 mb-2">{headerSlot}</div>}
      {children}
    </article>
  );
}

/**
 * Alias for PageSheet matching Odoo's `<form>` nomenclature.
 */
export const PageForm = PageSheet;
