import * as React from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PageDocsLinkProps {
  /** Target URL for documentation */
  href?: string;
  /** Custom click handler */
  onClick?: () => void;
  /** Accessible label / tooltip text */
  label?: string;
  /** Optional custom icon */
  icon?: React.ComponentType<{ className?: string }>;
  /** Custom class name */
  className?: string;
}

/**
 * Minimalist documentation link icon positioned beside Page.Title.
 * Opens documentation in a new tab with an accessible tooltip.
 *
 * @param props PageDocsLinkProps
 */
export function PageDocsLink({
  href,
  onClick,
  label,
  icon: Icon = BookOpen,
  className,
}: PageDocsLinkProps) {
  const { t } = useTranslation();
  const tooltipText = label || t("common.viewDocumentation", "View documentation");

  const buttonContent = (
    <span
      className={cn(
        "inline-flex items-center justify-center p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer",
        className
      )}
      aria-label={tooltipText}
    >
      <Icon className="h-4 w-4" />
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-slot="page-docs-link"
              className="inline-flex"
            >
              {buttonContent}
            </a>
          ) : (
            <button
              type="button"
              onClick={onClick}
              data-slot="page-docs-link"
              className="inline-flex"
            >
              {buttonContent}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
