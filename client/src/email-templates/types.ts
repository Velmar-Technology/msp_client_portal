export interface BaseEmailProps {
  recipientName: string;
  recipientEmail?: string;
  language?: 'en_US' | 'es_DO' | string;
}

export interface PasswordResetEmailProps extends BaseEmailProps {
  resetUrl: string;
  expiresInMinutes?: number;
}

export interface OTPEmailProps extends BaseEmailProps {
  otp: string;
  expiresInMinutes?: number;
}

export interface TicketEmailProps extends BaseEmailProps {
  ticketId: string;
  ticketTitle: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  description: string;
  ticketUrl: string;
  assignedTechnician?: string;
  status?: string;
}

export interface InvoiceEmailProps extends BaseEmailProps {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paymentUrl: string;
}

export interface PlanQuotationEmailProps extends BaseEmailProps {
  planName: string;
  billingCycle: string;
  equipmentCount: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
  features: Array<{ name: string; included: boolean }>;
}
