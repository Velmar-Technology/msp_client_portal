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
  RESOLVED_AUTOMATED = 'RESOLVED_AUTOMATED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TicketCategory {
  REPAIR = 'REPAIR',
  WARRANTY = 'WARRANTY',
  SERVICE_OUTAGE = 'SERVICE_OUTAGE',
  PREVENTATIVE_MAINTENANCE = 'PREVENTATIVE_MAINTENANCE',
  HELPDESK = 'HELPDESK',
  AI = 'AI',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
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
  CANCELLED = 'CANCELLED',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  READ_ONLY = 'READ_ONLY',
  SUSPENDED = 'SUSPENDED',
  PURGED = 'PURGED',
}

export type Currency = 'USD' | 'DOP';

// ---- Entity Interfaces ----

export interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  rnc?: string | null;
  account_status?: AccountStatus;
  read_only_at?: Date | null;
  suspended_at?: Date | null;
  purged_at?: Date | null;
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
  account_status?: AccountStatus;
  rnc?: string | null;
  email_verified: boolean;
  otp_code: string | null;
  otp_expires: Date | null;
  language: string;
  avatar_url: string | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  tenant_id: string;
  client_type: string;
  phone_number?: string | null;
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
  plan: string;
  status: SubscriptionStatus;
  renewal_date: Date;
  equipment_count: number;
  paypal_order_id?: string;
  tenant_id: string;
  last_warning_sent_at?: Date | null;
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
  currency?: string;
  ncf?: string | null;
  rnc?: string | null;
  status: InvoiceStatus;
  invoice_date: Date;
  due_date: Date;
  tenant_id: string;
  last_email_sent_at?: Date | string | null;
  created_at: Date;
}

export interface RoundRobinState {
  category: string;
  last_assigned_tech_id: string;
  updated_at: Date;
}

export type ApiKeyExpiry = '30d' | 'forever';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  expires_in: ApiKeyExpiry;
  token_hash: string;
  last_used_at: Date | null;
  tenant_id: string;
  created_at: Date;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  description: string | null;
  expiresIn: ApiKeyExpiry;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface GeneratedApiKey extends ApiKeySummary {
  fullKey: string;
}

export interface RmmAlert {
  id: string;
  alert_type: string;
  asset_id: string;
  received_at: Date;
  ticket_id: string | null;
  tenant_id: string;
  created_at: Date;
}

export interface RmmAlertInput {
  alertType: string;
  assetId: string;
  clientId: string;
  tenantId: string;
  executionTimeMs: number;
  priority?: TicketPriority;
  title?: string;
  description?: string;
  createdByUserId?: string;
}

export interface EscalationCandidate {
  id: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  assigned_tech_id: string | null;
  tenant_id: string;
  created_at: Date;
  responseCount: number;
}

// ---- Cache Abstraction (Port) ----

export interface CachePort {
  wrapVersioned<T>(
    namespace: string,
    scope: string,
    identifier: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T>;
  invalidateScope(namespace: string, scope?: string): Promise<number>;
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
  accountStatus?: AccountStatus;
}

/** Authenticated caller identity used to scope every ticket use case. */
export interface UserContext {
  userId: string;
  role: UserRole;
  tenantId: string;
  accountStatus?: AccountStatus;
}

/** Uploaded file metadata produced by the multer upload driver. */
export interface UploadedFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
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
  dateRange?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
  | 'NEW_REPLY'
  | 'SUBSCRIPTION_EXPIRING_SOON';

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

export enum PlanClientType {
  CLIENT = 'CLIENT',
  ENTERPRISE = 'ENTERPRISE',
  STUDENT = 'STUDENT',
  OTHER = 'OTHER',
}

export interface PlanFeature {
  code?: string;
  params?: Record<string, any>;
  text?: string | Record<string, string>;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string | Record<string, string>;
  description: string | Record<string, string> | null;
  price: number;
  features: PlanFeature[];
  recommended: boolean;
  client_type: PlanClientType;
  active: boolean;
  is_custom?: boolean;
  tenant_id?: string | null;
  lead_id?: string | null;
  target_client_id?: string | null;
  per_device_price?: number;
  ticket_quota?: number | null;
  sla_tier?: { criticalMins: number; highMins: number; medMins: number; lowMins: number } | null;
  tax_exempt?: boolean;
  paypal_plan_id_monthly?: string | null;
  paypal_plan_id_annual?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlanFilters {
  search?: string;
  clientType?: PlanClientType;
  includeInactive?: boolean;
  includeCustom?: boolean;
  tenantId?: string;
  leadId?: string;
  page?: number;
  limit?: number;
}

export interface SubscriptionEquipment {
  id: string;
  subscription_id: string;
  slot_index: number;
  status: 'PENDING_ACTIVATION' | 'ACTIVE';
  device_name: string | null;
  device_serial: string | null;
  agent_instance_id?: string | null;
  agent_hostname?: string | null;
  agent_serial?: string | null;
  agent_last_seen_at?: Date | null;
  agent_token?: string | null;
  otp: string | null;
  otp_expires_at: Date | null;
  nextcloud_username: string | null;
  nextcloud_password: string | null;
  tenant_id: string;
  nextcloud_used_bytes?: number;
  nextcloud_total_bytes?: number;
  agent_status?: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string | null;
  cpu_usage?: number | null;
  memory_usage?: number | null;
  disk_usage?: number | null;
  disk_used_gb?: number | null;
  disk_total_gb?: number | null;
  pending_patch_count?: number | null;
  last_sync_at?: Date | null;
  monthly_ticket_count?: number;
  monthly_ticket_limit?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface EquipmentWithDetails extends SubscriptionEquipment {
  client_name: string;
  client_email: string;
  client_role: string;
  service_name: string;
  plan: string;
  tenant_name: string;
  subscription_status: string;
}



export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: Date;
  tenant_id: string;
  expense_identifier?: string | null;
  created_at: Date;
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

export enum MaintenanceType {
  PREDEFINED_6M = 'PREDEFINED_6M',
  PREDEFINED_3M = 'PREDEFINED_3M',
  PREDEFINED_12M = 'PREDEFINED_12M',
  CUSTOM_DATE = 'CUSTOM_DATE',
}

export interface DeviceMaintenance {
  id: string;
  equipment_id: string;
  subscription_id: string;
  client_id: string;
  tenant_id: string;
  assigned_tech_id: string | null;
  scheduled_date: Date;
  status: MaintenanceStatus | string;
  title: string;
  notes: string | null;
  maintenance_type: MaintenanceType | string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  device_name?: string | null;
  device_serial?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  assigned_tech_name?: string | null;
  service_name?: string | null;
}

// ---- RMM & Patch Management Types ----

export enum RmmPatchStatus {
  PENDING = 'PENDING',
  INSTALLING = 'INSTALLING',
  INSTALLED = 'INSTALLED',
  FAILED = 'FAILED',
}

export enum RmmPatchSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface RmmPatchItem {
  id: string;
  equipment_id: string;
  patch_id: string;
  title: string;
  severity: RmmPatchSeverity | string;
  status: RmmPatchStatus | string;
  release_date?: Date | null;
  installed_at?: Date | null;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface RmmDeviceTelemetry {
  id: string;
  equipment_id: string;
  zabbix_host_id: string | null;
  agent_status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  disk_used_gb?: number | null;
  disk_total_gb?: number | null;
  pending_patch_count: number;
  last_sync_at: Date | null;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  device_name?: string | null;
  device_serial?: string | null;
}

export interface ZabbixWebhookPayload {
  eventid?: string | number;
  triggername?: string;
  alertType?: string;
  hostname?: string;
  assetId?: string;
  severity?: string | number;
  executionTimeMs?: number;
  tenantId?: string;
  clientId?: string;
  message?: string;
  value?: string | number;
}

export interface RmmOverviewStats {
  monitoredDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingPatchesCount: number;
  noiseReductionRatio: number;
  selfHealingEfficiency: number;
  automatedFCR: number;
}

// ---- CRM & Lead Pipeline Types ----

export enum LeadStage {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  PROPOSITION = 'PROPOSITION',
  WON = 'WON',
  LOST = 'LOST',
}

export enum LeadPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export interface Lead {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  company_name?: string | null;
  stage: LeadStage | string;
  plan_id?: string | null;
  billing_cycle: 'monthly' | 'annual' | string;
  equipment_count: number;
  expected_revenue: number;
  probability: number;
  priority: LeadPriority | string;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  plan_name?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  next_follow_up_date?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  tenant_id: string;
  lead_id?: string | null;
  client_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  plan_id: string;
  plan_name?: string | null;
  billing_cycle: 'monthly' | 'annual' | string;
  equipment_count: number;
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus | string;
  valid_until?: Date | null;
  sent_at: Date;
  last_reminder_sent_at?: Date | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: Date;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  tenant_id: string;
  user_id?: string | null;
  user_name?: string | null;
  activity_type: 'EMAIL_SENT' | 'QUOTE_SENT' | 'QUOTE_REMINDER' | 'QUOTE_STATUS_CHANGE' | 'CALL' | 'MEETING' | 'NOTE' | 'STAGE_CHANGE' | 'PLAN_ASSIGNED' | 'SUB_MODIFIED' | string;
  title: string;
  summary?: string | null;
  due_date?: Date | null;
  completed_at?: Date | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | string;
  created_at: Date;
  lead_contact_name?: string | null;
  lead_company_name?: string | null;
}

export interface CrmPipelineStats {
  totalLeads: number;
  pipelineValue: number;
  wonRevenue: number;
  leadsInProposition: number;
  conversionRate: number;
  stageBreakdown: {
    NEW: { count: number; value: number };
    QUALIFIED: { count: number; value: number };
    PROPOSITION: { count: number; value: number };
    WON: { count: number; value: number };
    LOST: { count: number; value: number };
  };
}

// ---- Technician Earnings & Rates Types ----

export enum EarningStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  VOIDED = 'VOIDED',
}

export interface TechnicianRate {
  id: string;
  technician_id: string | null;
  base_closed_rate: number;
  sla_bonus_rate: number;
  currency: string;
  multiplier_critical: number;
  multiplier_high: number;
  multiplier_medium: number;
  multiplier_low: number;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface TechnicianEarningBreakdown {
  priority: string;
  category: string;
  priorityMultiplier: number;
  slaMet: boolean;
  resolutionTimeMinutes: number;
  targetSlaMinutes?: number;
}

export interface TechnicianEarning {
  id: string;
  ticket_id: string;
  technician_id: string;
  base_amount: number;
  sla_bonus_amount: number;
  final_amount: number;
  currency: string;
  status: EarningStatus | string;
  breakdown: TechnicianEarningBreakdown;
  expense_id: string | null;
  tenant_id: string;
  earned_at: Date;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  ticket_title?: string;
  technician_name?: string;
  technician_email?: string;
}

export interface TechnicianEarningsSummary {
  technician_id: string;
  technician_name?: string;
  total_closed_tickets: number;
  total_earned: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  sla_met_count: number;
  sla_met_rate: number;
}


