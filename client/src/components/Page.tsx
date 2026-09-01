import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";

export interface PageProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
  isLoading?: boolean;
}

export function Page({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  children,
  className,
  isLoading,
  ...props
}: PageProps) {
  return (
    <MaxWidthWrapper className={cn("animate-fade-in text-foreground", className)} {...props}>
      {showBreadcrumbs && <Breadcrumbs className="mb-4 text-muted-foreground" />}
      {(title || subtitle || actions) && (
        <div className="mb-6 flex flex-col sm:flex-row min-h-20 justify-between items-start sm:items-center gap-3">
          {(title || subtitle) && (
            <div className="space-y-0.5">
              {title && (
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading animate-fade-in">
                  {title}
                </h1>
              )}
              {subtitle && <p className="text-xs text-muted-foreground animate-fade-in">{subtitle}</p>}
            </div>
          )}
          {actions ? (
            isLoading ? (
              <Skeleton className="animate-fade-in shrink-0 w-32 h-7 rounded-sm" />
            ) : (
              <div className="flex items-center gap-2 animate-fade-in shrink-0">{actions}</div>
            )
          ) : null}
        </div>
      )}
      {children}
    </MaxWidthWrapper>
  );
}
