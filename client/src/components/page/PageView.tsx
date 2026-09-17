import { cn } from "@/lib/utils";
import { usePageContext } from "./PageContext";
import type { PageViewProps } from "./types";

/**
 * Declarative conditional container for a specific view mode (e.g. list, kanban, form).
 * Only renders its children when its `type` matches the active view mode in PageContext.
 */
export function PageView({ type, children, className, ...props }: PageViewProps) {
  const { activeView } = usePageContext();

  if (activeView !== type) {
    return null;
  }

  return (
    <div className={cn("animate-fade-in w-full", className)} {...props}>
      {children}
    </div>
  );
}
