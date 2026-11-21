import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageContext } from "./PageContext";
import type { PagePagerProps } from "./types";

/**
 * Compact Odoo-style dense pager (< 1-50 / 230 >) in an h-7 footprint.
 * Automatically consumes PageContext pagination state if not explicitly passed.
 */
export function PagePager({
  page: propPage,
  pageSize: propPageSize,
  totalCount: propTotalCount,
  onPageChange: propOnPageChange,
  className,
  ...props
}: PagePagerProps) {
  const { t } = useTranslation();
  const context = React.useContext(PageContext);

  const page = propPage ?? context?.page ?? 1;
  const pageSize = propPageSize ?? context?.pageSize ?? 25;
  const totalCount = propTotalCount ?? context?.totalCount;
  const onPageChange = propOnPageChange ?? context?.setPage;

  if (totalCount === undefined || totalCount <= 0) {
    return null;
  }

  const startRecord = Math.min((page - 1) * pageSize + 1, totalCount);
  const endRecord = Math.min(page * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious && onPageChange) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext && onPageChange) {
      onPageChange(page + 1);
    }
  };

  return (
    <div
      role="navigation"
      aria-label={t("common.pagination", "Pagination")}
      className={cn("flex items-center gap-1 text-xs text-muted-foreground select-none shrink-0", className)}
      {...props}
    >
      <span className="font-mono text-foreground font-medium px-1">
        {startRecord}-{endRecord} <span className="text-muted-foreground font-normal">/ {totalCount}</span>
      </span>

      <div className="flex items-center border border-border rounded-md bg-muted/30 p-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={!canGoPrevious}
          onClick={handlePrevious}
          className="size-6 rounded cursor-pointer disabled:cursor-not-allowed hover:bg-background transition-colors"
          title={t("common.previousPage", "Previous page")}
          aria-label={t("common.previousPage", "Previous page")}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={!canGoNext}
          onClick={handleNext}
          className="size-6 rounded cursor-pointer disabled:cursor-not-allowed hover:bg-background transition-colors"
          title={t("common.nextPage", "Next page")}
          aria-label={t("common.nextPage", "Next page")}
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
