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

export interface ClientSummary {
  tenantId: string;
  tenantName: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  plan: string;
  subscriptionStatus: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
}

export interface HardwareComponentItem {
  type: 'BASEBOARD' | 'CPU' | 'RAM' | 'STORAGE' | 'GPU' | 'NETWORK' | 'BATTERY' | 'PERIPHERAL';
  brand: string;
  model: string;
  serialNumber: string;
  partNumber?: string;
  slotOrLocation?: string;
  capacityOrSpec?: string;
  status: 'VERIFIED_ORIGINAL' | 'HEALTHY' | 'WARNING' | 'REPLACED_UPGRADED';
}

export interface DeviceComponentDetails {
  id: string;
  deviceName: string;
  deviceSerial: string;
  deviceBrand: string;
  deviceModel: string;
  deviceCategory: 'SERVER' | 'LAPTOP' | 'WORKSTATION' | 'POS_TERMINAL' | 'DESKTOP';
  hostname?: string;
  tenantId: string;
  tenantName?: string;
  clientName?: string;
  clientEmail?: string;
  status: string;
  agentStatus: string;
  hardwareFingerprint: {
    integrityHash: string;
    chainOfCustodyStatus: 'VERIFIED_INTACT' | 'MODIFIED_VERIFIED' | 'DISCREPANCY_DETECTED';
    totalAuditedComponents: number;
    auditTimestamp: string;
  };
  componentInventory: HardwareComponentItem[];
  components: {
    cpu: {
      model: string;
      currentUsagePct: number;
      status: 'HEALTHY' | 'ELEVATED' | 'CRITICAL';
    };
    memory: {
      spec: string;
      currentUsagePct: number;
      status: 'HEALTHY' | 'ELEVATED' | 'CRITICAL';
    };
    storage: {
      spec: string;
      usedGb: number;
      totalGb: number;
      usagePct: number;
      freeGb: number;
      status: 'HEALTHY' | 'ELEVATED' | 'CRITICAL';
    };
    osAndSecurity: {
      pendingPatches: number;
      securityStatus: string;
      lastSyncAt?: string | null;
    };
    cloudStorage: {
      username?: string | null;
      provisioned: boolean;
    };
  };
  maintenances?: any[];
  recommendations: string[];
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

