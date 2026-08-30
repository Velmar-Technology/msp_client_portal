import { UserRole } from '@shared/types';

/**
 * Standard Zanzibar Relationship Tuple representation:
 * format: `<subject>#<relation>@<object>` (e.g. `user:usr-1#assigned_technician@ticket:t-101`)
 */
export interface RelationTuple {
  subject: string;
  relation: string;
  object: string;
}

/**
 * Subject requesting authorization.
 */
export interface AuthzSubject {
  id: string;
  type: 'user' | 'service_account' | 'agent';
  role: UserRole;
  tenantId?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Resource target being evaluated.
 */
export interface AuthzResource {
  id: string;
  type: string;
  tenantId?: string;
  ownerId?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Environmental and dynamic contextual attributes for ABAC evaluation.
 */
export interface AuthzEnvironment {
  timestamp?: Date;
  clientIp?: string;
  deviceCompliant?: boolean;
  isBusinessHours?: boolean;
  accountStatus?: string;
  geoCountry?: string;
}

/**
 * Complete context passed into the Policy Decision Point (PDP).
 */
export interface AuthzContext {
  subject: AuthzSubject;
  action: string;
  resource: AuthzResource;
  environment?: AuthzEnvironment;
}

/**
 * Authorization outcome returned by the PDP.
 */
export interface AuthzDecision {
  allowed: boolean;
  reason?: string;
  violatedPolicy?: string;
  requiredStepUpMfa?: boolean;
}

/**
 * Document access level classifications for AI/RAG data indexing.
 */
export type DocumentAccessLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

/**
 * Security and ACL metadata attached to vector database embeddings.
 */
export interface DocumentChunkAcl {
  chunkId: string;
  documentId: string;
  tenantId: string;
  allowedRoles: UserRole[];
  allowedSubjectIds?: string[];
  accessLevel: DocumentAccessLevel;
}

/**
 * Dual-phase vector retrieval filter specification.
 */
export interface VectorAclFilter {
  sqlWhereClause: string;
  sqlParams: Record<string, unknown>;
  metadataFilter: Record<string, unknown>;
}

/**
 * Continuous Adaptive Trust session telemetry event.
 */
export interface SessionTelemetry {
  userId: string;
  tenantId?: string;
  clientIp: string;
  userAgent?: string;
  action: string;
  timestamp: Date;
  bytesTransferred?: number;
  geoCountry?: string;
}

/**
 * Real-time continuous risk evaluation result.
 */
export interface RiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomalies: string[];
  shouldTriggerStepUpMfa: boolean;
  shouldDropSession: boolean;
}

/**
 * Audit log entry for unsupervised role mining analysis.
 */
export interface EntitlementLog {
  userId: string;
  role: string;
  permission: string;
  frequency: number;
  lastUsed: Date;
}

/**
 * Output from the role mining clustering algorithm.
 */
export interface RoleMiningSuggestion {
  proposedRoleName: string;
  includedPermissions: string[];
  affectedUsers: string[];
  redundancyScore: number;
  entitlementDriftDetected: boolean;
}

/**
 * Declarative Policy Rule representation for Policy-as-Code.
 */
export interface PolicyRule {
  id: string;
  name: string;
  version: string;
  resourceType: string;
  actions: string[];
  effect: 'ALLOW' | 'DENY';
  evaluator: (ctx: AuthzContext) => boolean | Promise<boolean>;
  priority?: number;
}
