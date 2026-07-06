// ============================================
// MSP Help Desk — Shared Types & Interfaces
// ============================================

// ---- Enums ----

export enum UserRole {
  CLIENT = 'CLIENT',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TicketCategory {
  REPAIR = 'REPAIR',
  WARRANTY = 'WARRANTY',
  SERVICE_OUTAGE = 'SERVICE_OUTAGE',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SubscriptionPlan {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  PL_001 = 'PL-001',
  PL_002 = 'PL-002',
  PL_003 = 'PL-003',
  PL_004 = 'PL-004',
  PL_005 = 'PL-005',
  PL_006 = 'PL-006',
  PL_007 = 'PL-007',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

// ---- Entity Interfaces ----

export interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  specialty: string | null;
  is_active: boolean;
  email_verified: boolean;
  otp_code: string | null;
  otp_expires: Date | null;
  language: string;
  avatar_url: string | null;
  otp_code: string | null;
  otp_expires: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  tenant_id: string;
  client_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  client_id: string;
  assigned_tech_id: string | null;
  equipment_id: string | null;
  tenant_id: string;
  client_name?: string;
  client_email?: string;
  assigned_tech_name?: string | null;
  assigned_tech_email?: string | null;
  device_name?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  response_id?: string | null;
  filename: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  tenant_id: string;
  uploaded_at: Date;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  old_status: TicketStatus | null;
  new_status: TicketStatus;
  changed_by: string;
  notes: string | null;
  tenant_id: string;
  created_at: Date;
}

export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  tenant_id: string;
  created_at: Date;
  user_name?: string;
  user_role?: string;
  attachments?: TicketAttachment[];
}

export interface Subscription {
  id: string;
  client_id: string;
  service_name: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewal_date: Date;
  equipment_count: number;
  paypal_order_id?: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  invoice_date: Date;
  due_date: Date;
  tenant_id: string;
  created_at: Date;
}

export interface RoundRobinState {
  category: string;
  last_assigned_tech_id: string;
  updated_at: Date;
}

// ---- API Response Types ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---- Auth Types ----

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ---- Query Types ----

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignedTechId?: string;
  clientId?: string;
  tenantId?: string;
  equipmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ---- Notification Types ----

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  ticketId?: string;
  type: 'EMAIL' | 'WHATSAPP';
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  ticket_id: string | null;
  type: string;
  read: boolean;
  metadata: Record<string, any> | null;
  tenant_id: string;
  created_at: Date;
}

// ---- Notification Preference Types ----

export interface ChannelPreference {
  in_app: boolean;
  email: boolean;
  whatsapp: boolean;
}

export type NotificationEventType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_CANCELLED'
  | 'NEW_REPLY';

export type NotificationPreferencesMap = Record<NotificationEventType, ChannelPreference>;

export interface NotificationPreference {
  id: string;
  user_id: string;
  tenant_id: string;
  preferences: NotificationPreferencesMap;
  created_at: Date;
  updated_at: Date;
}

// ---- Plan Types ----

export interface PlanFeature {
  text: string | Record<string, string>;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string | Record<string, string>;
  description: string | Record<string, string> | null;
  price: number;
  features: PlanFeature[];
  recommended: boolean;
  client_type: string;
  active: boolean;
  paypal_plan_id_monthly?: string | null;
  paypal_plan_id_annual?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionEquipment {
  id: string;
  subscription_id: string;
  slot_index: number;
  status: 'PENDING_ACTIVATION' | 'ACTIVE';
  device_name: string | null;
  device_serial: string | null;
  otp: string | null;
  otp_expires_at: Date | null;
  nextcloud_username: string | null;
  nextcloud_password: string | null;
  tenant_id: string;
  nextcloud_used_bytes?: number;
  nextcloud_total_bytes?: number;
  created_at: Date;
  updated_at: Date;
}

