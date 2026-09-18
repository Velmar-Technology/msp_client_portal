import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  PageHeaderProps,
  PageHeaderRowProps,
  PageTitleGroupProps,
  PageTitleProps,
  PageDescriptionProps,
  PageBackProps,
  PageActionsProps,
  PageToolbarProps,
  PageFiltersProps,
  PageControlsProps,
} from "./types";

/**
 * Enterprise PageHeader container component.
 * Coordinates page identity (title, breadcrumbs, badges), action toolbars,
 * search/filter bars, and tabs with optional sticky glassmorphic pinning.
 *
 * @param props - Configuration and children for the header.
 * @returns Header element.
 */
export function PageHeader({
  sticky = false,
  bordered = true,
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "w-full mb-6 space-y-3",
        bordered && "border-b border-border/40 pb-3",
        sticky &&
          "sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-3 backdrop-blur-md bg-background/85 transition-all shadow-xs",
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}

/**
 * Primary identity and action row within PageHeader.
 * Aligns the title group on the left and primary action buttons on the right.
 */
export function PageHeaderRow({
  className,
  children,
  ...props
}: PageHeaderRowProps) {
  return (
    <div
      data-slot="page-header-row"
      className={cn(
        "flex flex-col sm:flex-row min-h-12 justify-between items-start sm:items-center gap-3 w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Container for page identity items: back button, title, badges, and subtitle.
 */
export function PageTitleGroup({
  className,
  children,
  ...props
}: PageTitleGroupProps) {
  return (
    <div
      data-slot="page-title-group"
      className={cn("flex flex-col space-y-1 min-w-0 flex-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Main typography title element (`<h1>`).
 */
export function PageTitle({
  className,
  children,
  ...props
}: PageTitleProps) {
  return (
    <h1
      data-slot="page-title"
      className={cn(
        "text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading animate-fade-in truncate",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * Page description / subtitle typography element (`<p>`).
 */
export function PageDescription({
  className,
  children,
  ...props
}: PageDescriptionProps) {
  return (
    <p
      data-slot="page-description"
      className={cn(
        "text-xs text-muted-foreground animate-fade-in line-clamp-2",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Contextual back button for quick return navigation.
 * Adheres to compact `h-7 w-7` control standard.
 */
export function PageBack({
  to,
  onClick,
  label = "Back",
  className,
  ...props
}: PageBackProps) {
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch {
    // Outside react-router context (e.g. isolated test)
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to && navigate) {
      navigate(to);
      return;
    }
    if (navigate) {
      navigate(-1);
    } else if (typeof window !== "undefined" && window.history) {
      window.history.back();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-slot="page-back"
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={cn("h-7 w-7 p-0 shrink-0 rounded-sm text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      <ArrowLeft className="size-4" />
    </Button>
  );
}

/**
 * Action button group with responsive overflow collapsing.
 * If total actions exceed `maxVisible`, remaining buttons collapse into
 * a compact `MoreHorizontal` dropdown menu.
 */
export function PageActions({
  maxVisible,
  overflowLabel = "More actions",
  className,
  children,
  ...props
}: PageActionsProps) {
  const childList = React.useMemo(
    () => React.Children.toArray(children).filter(Boolean),
    [children]
  );

  const shouldOverflow =
    typeof maxVisible === "number" &&
    maxVisible > 0 &&
    childList.length > maxVisible;

  if (!shouldOverflow) {
    return (
      <div
        data-slot="page-actions"
        className={cn("flex items-center gap-2 animate-fade-in shrink-0", className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  const primaryActions = childList.slice(0, maxVisible);
  const overflowActions = childList.slice(maxVisible);

  return (
    <div
      data-slot="page-actions"
      className={cn("flex items-center gap-2 animate-fade-in shrink-0", className)}
      {...props}
    >
      {primaryActions}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={overflowLabel}
            title={overflowLabel}
            data-slot="page-actions-overflow"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {overflowActions.map((action, idx) => {
            if (React.isValidElement(action)) {
              const actionProps = action.props as {
                onClick?: React.MouseEventHandler<HTMLElement>;
                disabled?: boolean;
                children?: React.ReactNode;
                title?: string;
                className?: string;
              };

              return (
                <DropdownMenuItem
                  key={action.key ?? idx}
                  disabled={actionProps.disabled}
                  onClick={actionProps.onClick}
                  className="cursor-pointer text-xs flex items-center gap-2"
                >
                  {actionProps.children ?? actionProps.title ?? "Action"}
                </DropdownMenuItem>
              );
            }
            return <DropdownMenuItem key={idx}>{action}</DropdownMenuItem>;
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Data control toolbar row for search, filters, pagination, and view switchers.
 * Replaces the legacy multi-row control panel with a unified slot layout.
 */
export function PageToolbar({
  className,
  children,
  ...props
}: PageToolbarProps) {
  return (
    <div
      data-slot="page-toolbar"
      className={cn(
        "flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Container for search and filter controls inside PageToolbar.
 */
export function PageFilters({
  className,
  children,
  ...props
}: PageFiltersProps) {
  return (
    <div
      data-slot="page-filters"
      className={cn("flex flex-wrap items-center gap-2.5 flex-1 min-w-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Right-aligned container for pagination and view switcher controls inside PageToolbar.
 */
export function PageControls({
  className,
  children,
  ...props
}: PageControlsProps) {
  return (
    <div
      data-slot="page-controls"
      className={cn("flex items-center justify-between sm:justify-end gap-3 shrink-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}
