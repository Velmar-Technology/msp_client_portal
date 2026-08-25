/**
 * Billing & Pricing Constants
 */

/** ITBIS sales tax rate applied to plan quotations and invoices (18%). */
export const TAX_RATE = 0.18;

/** Standard status badge styles for invoices */
export const INVOICE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-secondary text-secondary-foreground border-border",
  PAID: "bg-primary/10 text-primary border-primary/20",
  OVERDUE: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};
