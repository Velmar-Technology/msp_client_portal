import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current active page index (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Page change callback */
  onPageChange: (page: number) => void;
  /** Total number of items (optional) */
  totalItems?: number;
  /** Items per page (optional) */
  pageSize?: number;
  /** Page size change callback (optional) */
  onPageSizeChange?: (size: number) => void;
  /** Page size options (default: [10, 25, 50, 100]) */
  pageSizeOptions?: number[];
  /** Custom label for page info, e.g. (current, total) => string */
  pageInfoLabel?: (current: number, total: number) => string;
}

/**
 * Standardized Pagination component adapted from Cal.com UI components.
 * High-density h-7 buttons with hairline borders and subtle pagination info.
 *
 * @param props - PaginationProps
 * @returns React.ReactElement
 * @see Cal.com Pagination.tsx
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  pageInfoLabel = (curr, total) => `Page ${curr} of ${Math.max(total, 1)}`,
  className,
  ...props
}: PaginationProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div
      data-slot="pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground", className)}
      {...props}
    >
      {/* Left side info / limit selector */}
      <div className="flex items-center gap-3">
        {totalItems !== undefined && (
          <span className="font-mono">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
        )}

        {pageSize !== undefined && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-7 w-[68px] text-xs border-border/70 bg-background shadow-subtle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side navigation */}
      <div className="flex items-center gap-2">
        <span className="font-mono">{pageInfoLabel(currentPage, totalPages)}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
            className="h-7 w-7 rounded-md border-border/70 shadow-subtle"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            aria-label="Next page"
            className="h-7 w-7 rounded-md border-border/70 shadow-subtle"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
