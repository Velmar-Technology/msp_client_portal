export interface MspServerConfig {
  apiUrl: string;
  apiToken: string;
  tenantId?: string;
}

export interface TicketSummary {
  id: string;
  title: string;
  description: string;
  category: 'REPAIR' | 'WARRANTY' | 'SERVICE_OUTAGE' | 'PREVENTATIVE_MAINTENANCE';
  status: 'OPEN' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'RESOLVED' | 'RESOLVED_AUTOMATED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  clientId: string;
  assignedTechId?: string | null;
  equipmentId?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceTelemetry {
  id: string;
  equipmentId: string;
  agentStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  diskUsedGb: number;
  diskTotalGb: number;
  pendingPatchCount: number;
  lastSyncAt?: string | null;
  tenantId: string;
}

export interface DevicePatch {
  id: string;
  equipmentId: string;
  patchId: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'INSTALLED' | 'FAILED';
  releaseDate?: string | null;
  installedAt?: string | null;
}

export interface EquipmentSlot {
  id: string;
  subscriptionId: string;
  slotIndex: number;
  status: string;
  deviceName?: string | null;
  deviceSerial?: string | null;
  nextcloudUsername?: string | null;
  tenantId: string;
}

export interface ClientHealthReport {
  tenantId: string;
  tenantName?: string;
  score: number;
  ticketHealth: number;
  hardwareHealth: number;
  securityHealth: number;
  openTicketCount: number;
  criticalTicketCount: number;
  outdatedDeviceCount: number;
  slaBreachRisk: boolean;
  recommendations: string[];
}

export interface EphemeralGrant {
  id: string;
  userId: string;
  tenantId: string;
  elevatedRole: string;
  grantedAt: string;
  expiresAt: string;
  reason: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  isBreakGlass?: boolean;
}

export interface AccessDecisionResult {
  allowed: boolean;
  reason?: string;
  decisionTier?: 'RBAC' | 'REBAC' | 'ABAC' | 'EPHEMERAL_ZSP' | 'DENIED';
  evaluatedAt: string;
}

export interface TrustScoreResult {
  userId: string;
  riskScore: number;
  trustLevel: 'HIGH_TRUST' | 'NORMAL' | 'ELEVATED_RISK' | 'CRITICAL_ANOMALY';
  mfaRequired: boolean;
  factors: string[];
}

