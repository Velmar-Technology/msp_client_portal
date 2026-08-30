/**
 * Standard constants for the SOTA Principle of Least Privilege (PoLP) and Zero-Trust Authorization System.
 */

// -------------------------------------------------------------
// Ephemeral & Just-In-Time (JIT) Access Constants
// -------------------------------------------------------------
export const JIT_CONSTANTS = {
  /** Minimum allowable JIT access window in minutes */
  MIN_DURATION_MINUTES: 1,
  /** Maximum allowable JIT access window in minutes (8 hours) */
  MAX_DURATION_MINUTES: 480,
  /** Default requested JIT duration in minutes */
  DEFAULT_DURATION_MINUTES: 30,
  /** Minimum required characters for JIT business justification */
  MIN_JUSTIFICATION_LENGTH: 5,
} as const;

// -------------------------------------------------------------
// Continuous Adaptive Trust & Risk Scoring Constants
// -------------------------------------------------------------
export const RISK_SCORING_WEIGHTS = {
  /** Risk penalty for data exfiltration / spike */
  DATA_EXFILTRATION_SPIKE: 45,
  /** Risk penalty for anomalous high request velocity */
  VELOCITY_BURST: 35,
  /** Risk penalty for impossible geographic travel speed */
  IMPOSSIBLE_TRAVEL: 60,
  /** Risk penalty for non-compliant / unmanaged device */
  DEVICE_NON_COMPLIANT: 30,
  /** Risk penalty for administrative actions outside business hours */
  OFF_HOURS_ACTIVITY: 15,
} as const;

export const RISK_THRESHOLDS = {
  /** Risk score below this is considered LOW */
  LOW_MAX: 24,
  /** Risk score in [25, 49] is MEDIUM (triggers step-up MFA) */
  MEDIUM_MIN: 25,
  /** Risk score in [50, 74] is HIGH (triggers step-up MFA) */
  HIGH_MIN: 50,
  /** Risk score >= 75 is CRITICAL (drops session immediately) */
  CRITICAL_MIN: 75,
} as const;

export const TELEMETRY_LIMITS = {
  /** Maximum single data transfer allowed before flagging an anomaly (50 MB) */
  DATA_SPIKE_THRESHOLD_BYTES: 50 * 1024 * 1024,
  /** Maximum allowed actions in a 60-second window before velocity anomaly */
  VELOCITY_SPIKE_THRESHOLD: 40,
  /** Window for velocity anomaly calculations in milliseconds (60 seconds) */
  VELOCITY_WINDOW_MS: 60 * 1000,
  /** Maximum elapsed time (minutes) between distant geo logins for impossible travel */
  IMPOSSIBLE_TRAVEL_WINDOW_MINUTES: 120,
  /** Maximum number of historical session telemetry records stored per user */
  MAX_SESSION_HISTORY_ITEMS: 100,
} as const;

// -------------------------------------------------------------
// Role Mining & Entitlement Pruning Constants
// -------------------------------------------------------------
export const ROLE_MINING_CONSTANTS = {
  /** Default usage frequency ratio threshold (30%) required to retain a permission */
  DEFAULT_FREQUENCY_THRESHOLD: 0.3,
  /** Minimum absolute count of actions for unconditional permission inclusion */
  MIN_ABSOLUTE_ACTION_COUNT: 5,
  /** Redundancy score threshold (40% unused) that flags active entitlement drift */
  ENTITLEMENT_DRIFT_THRESHOLD: 0.4,
} as const;

// -------------------------------------------------------------
// Workload Identity & SPIFFE Constants
// -------------------------------------------------------------
export const WORKLOAD_CONSTANTS = {
  /** Default validity window for workload tokens in seconds (5 minutes) */
  DEFAULT_TTL_SECONDS: 300,
  /** Maximum allowed validity window for workload tokens (1 hour) */
  MAX_TTL_SECONDS: 3600,
  /** Canonical SPIFFE URI scheme and authority domain */
  SPIFFE_SCHEME: 'spiffe://msp.portal',
  /** Workload cryptographic nonce length in bytes */
  NONCE_BYTES_LENGTH: 16,
  /** Fallback signing secret key for development / testing */
  DEFAULT_SIGNING_SECRET: 'sota-polp-workload-secret-key-32b',
} as const;

// -------------------------------------------------------------
// Contextual Step-Up MFA Challenge Constants
// -------------------------------------------------------------
export const STEP_UP_CONSTANTS = {
  /** Default validity duration for a Step-Up challenge in seconds (3 minutes) */
  DEFAULT_TTL_SECONDS: 180,
  /** Simulation / mock verification code for testing environments */
  MOCK_VALID_CODE: 'VALID_STEPUP_CODE',
} as const;

// -------------------------------------------------------------
// RBAC & Action Boundary Constants
// -------------------------------------------------------------
export const AUTHZ_ACTION_MAPPINGS = {
  /** Default allowed actions for client role */
  ALLOWED_CLIENT_ACTIONS: ['read', 'list', 'create', 'cancel', 'comment', 'view'] as const,
  /** Default mapping from action name to required Zanzibar relation */
  ACTION_RELATION_MAP: {
    read: 'viewer',
    view: 'viewer',
    list: 'viewer',
    comment: 'viewer',
    update: 'editor',
    write: 'editor',
    cancel: 'owner',
    delete: 'owner',
    assign: 'admin',
  } as Record<string, string>,
} as const;
