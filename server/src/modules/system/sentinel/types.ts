/**
 * Core type definitions, contracts, and invariant structures for SequenceSentinel.
 * SequenceSentinel passively audits production sequences against Master Business Logic (BL-101 to BL-802).
 */

/** Target entity classification for audit sequences */
export type EntityType = 'TICKET' | 'INVOICE' | 'SUBSCRIPTION' | 'DEVICE' | 'LEAD' | 'TENANT';

/** Severity level for detected business logic violations */
export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/** Categorization for business logic checker suites */
export type CheckerCategory =
  | 'TICKETING'
  | 'SUBSCRIPTIONS'
  | 'SECURITY'
  | 'BILLING'
  | 'FINANCIAL'
  | 'CRM_HEALTH';

/**
 * Defines the temporal query boundary for passive event ingestion.
 */
export interface SequenceAuditWindow {
  /** Earliest event timestamp to evaluate */
  readonly startDate: Date;
  /** Latest event timestamp to evaluate */
  readonly endDate: Date;
  /** Optional tenant filter for scoped tenant isolation audits */
  readonly tenantId?: string;
}

/**
 * Represents a discrete state transition or operational event in a multi-step sequence.
 */
export interface ActionStep {
  readonly id: string;
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly action: string;
  readonly timestamp: Date;
  readonly actorId?: string | null;
  readonly actorRole?: string | null;
  readonly tenantId: string;
  readonly metadata?: Record<string, unknown> | null;
  readonly previousState?: Record<string, unknown> | null;
  readonly newState?: Record<string, unknown> | null;
}

/**
 * Chronologically assembled graph of related operational steps tied to a root entity.
 */
export interface ActionSequence {
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly tenantId: string;
  readonly steps: ActionStep[];
  readonly rootContext?: Record<string, unknown>;
}

/**
 * Concrete violation record produced when an action sequence breaches a codified business rule.
 */
export interface InvariantViolation {
  readonly ruleCode: string;
  readonly ruleName: string;
  readonly severity: ViolationSeverity;
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly tenantId: string;
  readonly violatedAt: Date;
  readonly rationale: string;
  readonly evidence: Record<string, unknown>;
  readonly actionSequence?: ActionSequence;
}

/**
 * Result returned by an individual invariant checker across evaluated sequences.
 */
export interface InvariantCheckResult {
  readonly ruleCode: string;
  readonly ruleName: string;
  readonly category: CheckerCategory;
  readonly evaluatedCount: number;
  readonly violations: InvariantViolation[];
}

/**
 * Common contract for all modular business logic checkers (BL-101 through BL-802).
 */
export interface InvariantChecker {
  readonly ruleCode: string;
  readonly ruleName: string;
  readonly category: CheckerCategory;

  /**
   * Evaluates a collection of action sequences against the codified business logic rule.
   *
   * @param sequences - Chronologically assembled action sequences
   * @returns Invariant check result containing pass/fail counts and detected violations
   */
  evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult>;
}

/**
 * Scorecard summary row for executive and diagnostic reporting.
 */
export interface RuleScorecardEntry {
  readonly ruleCode: string;
  readonly ruleName: string;
  readonly category: CheckerCategory;
  readonly evaluatedCount: number;
  readonly violationCount: number;
  readonly status: 'PASS' | 'WARN' | 'FAIL';
}

/**
 * Result returned after an autonomous self-healing remediation attempt.
 */
export interface RemediationResult {
  readonly ruleCode: string;
  readonly entityId: string;
  readonly tenantId: string;
  readonly success: boolean;
  readonly actionTaken: string;
  readonly details?: Record<string, unknown>;
  readonly error?: string;
  readonly remediatedAt: Date;
}

/**
 * Interface implemented by autonomous remediation handlers.
 */
export interface RemediationHandler {
  readonly ruleCode: string;
  readonly name: string;
  remediate(violation: InvariantViolation): Promise<RemediationResult>;
}

/**
 * Comprehensive diagnostic report output by SequenceSentinel.
 */
export interface AuditReport {
  readonly generatedAt: Date;
  readonly auditWindow: SequenceAuditWindow;
  readonly totalSequencesEvaluated: number;
  readonly totalViolations: number;
  readonly scorecard: RuleScorecardEntry[];
  readonly violations: InvariantViolation[];
  readonly synthesizedTestPaths?: string[];
  readonly remediations?: RemediationResult[];
}
