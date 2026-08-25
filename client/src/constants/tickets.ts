export const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary border-primary/20",
  IN_PROGRESS: "bg-secondary text-secondary-foreground border-border",
  AWAITING_PAYMENT: "bg-secondary text-secondary-foreground border-border animate-pulse",
  RESOLVED: "bg-primary/10 text-primary border-primary/20",
  RESOLVED_AUTOMATED: "bg-primary/10 text-primary border-primary/20",
  CLOSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-foreground font-medium",
  HIGH: "text-destructive font-semibold",
  CRITICAL: "text-destructive font-bold",
};

// Aliases for compatibility
export const statusColor = TICKET_STATUS_COLORS;
export const priorityColor = TICKET_PRIORITY_COLORS;
