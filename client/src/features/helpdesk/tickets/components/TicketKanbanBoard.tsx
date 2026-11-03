import * as React from "react";
import { Clock, User, Building } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { useTicketReadStore } from "@/store/useTicketReadStore";
import type { TicketItem as Ticket } from "../api/ticketService";

export interface TicketKanbanBoardProps {
  tickets: Ticket[];
  loading?: boolean;
  onTicketClick: (ticket: Ticket) => void;
  userId?: string;
  className?: string;
}

interface KanbanColumnConfig {
  id: string;
  titleKey: string;
  defaultTitle: string;
  statuses: string[];
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "open",
    titleKey: "tickets.filterOpen",
    defaultTitle: "Open",
    statuses: ["OPEN"],
  },
  {
    id: "in_progress",
    titleKey: "tickets.filterInProgress",
    defaultTitle: "In Progress",
    statuses: ["IN_PROGRESS", "AWAITING_PAYMENT"],
  },
  {
    id: "resolved",
    titleKey: "tickets.filterResolved",
    defaultTitle: "Resolved",
    statuses: ["RESOLVED", "RESOLVED_AUTOMATED"],
  },
  {
    id: "closed",
    titleKey: "tickets.filterClosed",
    defaultTitle: "Closed",
    statuses: ["CLOSED", "CANCELLED"],
  },
];

/**
 * Kanban Board component for visual ticket workflow management.
 * Groups tickets into columns based on their operational status.
 */
export function TicketKanbanBoard({
  tickets,
  loading = false,
  onTicketClick,
  userId,
  className,
}: TicketKanbanBoardProps) {
  const { t, i18n } = useTranslation();
  const isTicketRead = useTicketReadStore((state) => state.isTicketRead);

  const groupedTickets = React.useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const col of KANBAN_COLUMNS) {
      map.set(col.id, []);
    }

    for (const ticket of tickets) {
      const col = KANBAN_COLUMNS.find((c) => c.statuses.includes(ticket.status));
      if (col) {
        map.get(col.id)?.push(ticket);
      } else {
        // Fallback into open column
        map.get("open")?.push(ticket);
      }
    }
    return map;
  }, [tickets]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className="bg-muted/40 rounded-lg p-3 min-h-96 border border-border/50">
            <div className="h-5 w-24 bg-muted rounded mb-3" />
            <div className="space-y-2.5">
              <div className="h-24 bg-card rounded-md border border-border/60" />
              <div className="h-24 bg-card rounded-md border border-border/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={t("tickets.kanbanBoard", "Tickets Kanban Board")}
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start", className)}
    >
      {KANBAN_COLUMNS.map((col) => {
        const columnTickets = groupedTickets.get(col.id) || [];

        return (
          <div
            key={col.id}
            className="flex flex-col bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/60 p-2.5 min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between gap-2 px-1 py-1.5 mb-2 border-b border-border/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-heading">
                {t(col.titleKey, col.defaultTitle)}
              </h3>
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[11px] font-mono font-semibold rounded-full"
              >
                {columnTickets.length}
              </Badge>
            </div>

            {/* Column Cards List */}
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {columnTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-2">
                  <p className="text-xs text-muted-foreground italic">
                    {t("tickets.noTicketsInStatus", "No tickets")}
                  </p>
                </div>
              ) : (
                columnTickets.map((ticket) => {
                  const read = isTicketRead(ticket.id, userId);

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => onTicketClick(ticket)}
                      className={cn(
                        "p-3 rounded-xl border border-border/80 bg-card hover:bg-card/90 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-2 text-left select-none",
                        !read && "border-l-4 border-l-primary"
                      )}
                    >
                      {/* Top: Ticket Number, Category & Priority */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                            #{ticket.id.slice(0, 8)}
                          </span>
                          {ticket.category && (
                            <span className="text-[9px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50 whitespace-nowrap">
                              {t(`tickets.categories.${ticket.category}`, ticket.category)}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border shrink-0",
                            ticket.priority === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : ticket.priority === "HIGH"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : ticket.priority === "MEDIUM"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : "bg-muted text-muted-foreground border-border/60"
                          )}
                        >
                          {t(`tickets.priorities.${ticket.priority}`, ticket.priority)}
                        </span>
                      </div>

                      {/* Title with Unread Indicator */}
                      <div className="flex items-start gap-1.5 min-w-0">
                        {!read && (
                          <span
                            className="size-1.5 rounded-full bg-primary shrink-0 mt-1 inline-block animate-pulse"
                            title={t("tickets.unread", "Unread")}
                            aria-label={t("tickets.unread", "Unread")}
                          />
                        )}
                        <h4
                          className={cn(
                            "text-xs leading-snug line-clamp-2",
                            read ? "font-normal text-muted-foreground" : "font-semibold text-foreground"
                          )}
                        >
                          {ticket.title}
                        </h4>
                      </div>

                      {/* Metadata: Client / Assigned Tech / Relative Time */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {ticket.client_name ? (
                            <div className="flex items-center gap-1 truncate" title={ticket.client_name}>
                              <Building className="size-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{ticket.client_name}</span>
                            </div>
                          ) : ticket.device_name ? (
                            <div className="flex items-center gap-1 truncate" title={ticket.device_name}>
                              <span className="font-mono truncate">{ticket.device_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 font-mono text-[9px]">�</span>
                          )}
                          {ticket.assigned_tech_name && (
                            <div className="flex items-center gap-1 truncate" title={ticket.assigned_tech_name}>
                              <User className="size-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{ticket.assigned_tech_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 shrink-0 font-mono">
                          <Clock className="size-2.5 shrink-0" />
                          <span>{formatRelativeTime(ticket.created_at, i18n.language)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
