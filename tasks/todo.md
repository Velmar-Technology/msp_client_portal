# Task List: SequenceSentinel (Master Business Logic Integrity Agent - Full Coverage BL-101 to BL-802)

## Phase 1: Core Framework & Multi-Domain Event Aggregator

### Task 1.1: Define Sentinel Core Types & Invariant Contracts
**Description:** Define the strict TypeScript interfaces in `server/src/modules/system/sentinel/types.ts` for temporal audit windows, action sequences, checker contracts, violation severity, audit summaries, and synthesizer payloads.
**Acceptance criteria:**
- [x] Export `InvariantChecker` interface with standard `evaluate(sequence: ActionSequence): Promise<InvariantCheckResult>`.
- [x] Export `InvariantViolation` with severity (`CRITICAL`, `HIGH`, `MEDIUM`), `ruleCode` (`BL-101`..`BL-802`), `entityId`, `evidence`, and `rationale`.
- [x] Export `ActionSequence` supporting entity types: `TICKET`, `INVOICE`, `SUBSCRIPTION`, `DEVICE`, `LEAD`, `TENANT`.
**Verification:**
- [x] `npm -w server run build` passes.
**Dependencies:** None
**Files touched:**
- `server/src/modules/system/sentinel/types.ts`
**Estimated scope:** Small (1 file)

---

### Task 1.2: Implement `SequenceAggregatorService`
**Description:** Build `SequenceAggregatorService` to read chronological events from PostgreSQL (`ticketEvents`, `technicianEarnings`, `expenses`, `invoices`, `subscriptions`, `rmmAlerts`, `leads`) over a sliding window without taking write locks, grouping events by entity into coherent `ActionSequence` graphs.
**Acceptance criteria:**
- [x] Aggregate ticket lifecycle events (`ticketEvents`, `tickets`, `technicianEarnings`, `expenses`).
- [x] Aggregate billing & subscription events (`invoices`, `subscriptions`, `tenants`).
- [x] Aggregate RMM telemetry & alert events (`rmmAlerts`, `subscriptionEquipment`).
- [x] Aggregate CRM deal progressions (`leads`, `leadActivities`).
- [x] Unit tests in `SequenceAggregatorService.test.ts` verify correct chronological sorting and multi-tenant grouping.
**Verification:**
- [x] `npm -w server test -- SequenceAggregatorService.test.ts` passes 100%.
**Dependencies:** Task 1.1
**Files touched:**
- `server/src/modules/system/sentinel/services/SequenceAggregatorService.ts`
- `server/src/modules/system/sentinel/services/SequenceAggregatorService.test.ts`
**Estimated scope:** Medium (2 files)

---

## Phase 2: Ticketing & SLA Invariant Checkers (BL-101, BL-102, BL-103, BL-104)

### Task 2.1: Implement `SlaCancellationChecker` (BL-101)
**Description:** Asserts that `WARRANTY` and `SERVICE_OUTAGE` tickets were only cancelled within 60 minutes of creation. Flags late cancellations as `CRITICAL` violations.
**Acceptance criteria:**
- [x] Identifies category in `['WARRANTY', 'SERVICE_OUTAGE']` and status `CANCELLED`.
- [x] Flags any cancellation where `cancelledAt - createdAt > 3,600,000 ms`.
- [x] Unit tests pass for valid, invalid, and exempt tickets.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/ticketing/SlaCancellationChecker.ts`
- `server/src/modules/system/sentinel/checkers/ticketing/SlaCancellationChecker.test.ts`

---

### Task 2.2: Implement `RoundRobinDispatchChecker` (BL-102)
**Description:** Audits technician dispatch sequence to ensure category specialist rotation is respected before fallback to the general pool.
**Acceptance criteria:**
- [x] Compares ticket assignment order against active specialist technician availability.
- [x] Flags unassigned tickets or assignments skipping active specialists without justification.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/ticketing/RoundRobinDispatchChecker.ts`
- `server/src/modules/system/sentinel/checkers/ticketing/RoundRobinDispatchChecker.test.ts`

---

### Task 2.3: Implement `AlertNoiseFlappingChecker` (BL-103)
**Description:** Asserts that alerts from the same asset are deduplicated within 15 minutes, self-resolving scripts ($\le 300\text{s}$) close as `RESOLVED_AUTOMATED`, and $\ge 3$ triggers in 24h tag `[FLAPPING_ALERT]` routing to Tier 2.
**Acceptance criteria:**
- [x] Flags unmerged alerts within 15m window.
- [x] Confirms automated resolutions didn't route to technician queue.
- [x] Flags flapping alerts lacking the `[FLAPPING_ALERT]` prefix or assigned below Tier 2.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/ticketing/AlertNoiseFlappingChecker.ts`
- `server/src/modules/system/sentinel/checkers/ticketing/AlertNoiseFlappingChecker.test.ts`

---

### Task 2.4: Implement `TierEscalationChecker` (BL-104)
**Description:** Audits open ticket sequences to verify unworked tickets escalated to Tier 2 within priority deadlines (CRITICAL 10m, HIGH 20m, MEDIUM 45m, LOW 120m).
**Acceptance criteria:**
- [x] Validates time delta from creation to first technician activity or `TIER_ESCALATED` event.
- [x] Flags tickets exceeding SLA threshold without Tier 2 escalation.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/ticketing/TierEscalationChecker.ts`
- `server/src/modules/system/sentinel/checkers/ticketing/TierEscalationChecker.test.ts`

---

## Phase 3: Subscriptions, Quotas & Equipment Checkers (BL-201, BL-202, BL-204, BL-205)

### Task 3.1: Implement `QuotaEnforcementChecker` (BL-201)
**Description:** Asserts that monthly ticket volume per tenant did not exceed plan limits (e.g. 5 tickets/device/mo). Flags quota breaches where tickets were created without overage authorization.
**Acceptance criteria:**
- [x] Counts monthly tickets vs plan allowance.
- [x] Flags unentitled ticket creations.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/subscriptions/QuotaEnforcementChecker.ts`
- `server/src/modules/system/sentinel/checkers/subscriptions/QuotaEnforcementChecker.test.ts`

---

### Task 3.2: Implement `LicenseTrueUpChecker` (BL-202)
**Description:** Verifies nightly reconciliation between active physical endpoints/cloud seats and baseline contract counts.
**Acceptance criteria:**
- [x] Compares active RMM agents to billed subscription quotas.
- [x] Flags untracked seats or unbilled devices.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/subscriptions/LicenseTrueUpChecker.ts`
- `server/src/modules/system/sentinel/checkers/subscriptions/LicenseTrueUpChecker.test.ts`

---

### Task 3.3: Implement `FeatureGatingChecker` (BL-204)
**Description:** Validates that feature codes (`FEATURE_CODES`) are strictly enforced, ensuring unentitled client tiers received HTTP 403 or locked previews.
**Acceptance criteria:**
- [x] Compares accessed features with tenant plan tier.
- [x] Flags unauthorized feature access events in audit logs.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/subscriptions/FeatureGatingChecker.ts`
- `server/src/modules/system/sentinel/checkers/subscriptions/FeatureGatingChecker.test.ts`

---

### Task 3.4: Implement `DeviceVaultSecurityChecker` (BL-205)
**Description:** Audits machine credential vault sessions. Ensures `hidePasswords: true` policy holds, machine slot bindings (`device_<slotId>@tenant.local`) are strictly isolated, and revoked endpoints terminate Bitwarden sessions.
**Acceptance criteria:**
- [x] Flags any plaintext credential exposure in logs or responses.
- [x] Asserts locked equipment (`vaultwarden_status = 'LOCKED'`) has no active session tokens.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/subscriptions/DeviceVaultSecurityChecker.ts`
- `server/src/modules/system/sentinel/checkers/subscriptions/DeviceVaultSecurityChecker.test.ts`

---

## Phase 4: Security, RBAC & State Machine Checkers (BL-301, BL-302)

### Task 4.1: Implement `StateMachineChecker` (BL-301)
**Description:** Validates all status transitions across tickets, leads, and subscriptions against the canonical `STATUS_TRANSITIONS` state machine matrix.
**Acceptance criteria:**
- [x] Verifies clients only execute permitted cancellations on owned tickets.
- [x] Verifies technicians only transition assigned tickets.
- [x] Flags illegal status skips (e.g. `CLOSED` -> `IN_PROGRESS` without reopening workflow).
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/security/StateMachineChecker.ts`
- `server/src/modules/system/sentinel/checkers/security/StateMachineChecker.test.ts`

---

### Task 4.2: Implement `AuthorizationAndJitChecker` (BL-302)
**Description:** Audits SOTA Hybrid Authorization and Zero Standing Privileges: verifies that JIT ephemeral access grants were strictly temporary, and flags any actions taken after grant expiration.
**Acceptance criteria:**
- [x] Cross-references JIT grant timestamps with actions executed by elevated actors.
- [x] Flags expired or unrevoked standing privileges.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/security/AuthorizationAndJitChecker.ts`
- `server/src/modules/system/sentinel/checkers/security/AuthorizationAndJitChecker.test.ts`

---

## Phase 5: Billing, Tax & Non-Payment Checkers (BL-401, BL-402, BL-701, BL-702)

### Task 5.1: Implement `SubscriptionReactivationChecker` (BL-401)
**Description:** Verifies that successful invoice payment captures (`PAID`) immediately transition linked `EXPIRED` client subscriptions to `ACTIVE` and broadcast alerts.
**Acceptance criteria:**
- [x] Inspects invoice payment sequences.
- [x] Flags paid invoices where client subscription remained `EXPIRED`.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/billing/SubscriptionReactivationChecker.ts`
- `server/src/modules/system/sentinel/checkers/billing/SubscriptionReactivationChecker.test.ts`

---

### Task 5.2: Implement `RenewalSchedulerChecker` (BL-402)
**Description:** Asserts that renewal cron evaluated expiry dates, applied hardware multipliers ($M_{\text{equip}}$), created invoices, and dispatched billing emails.
**Acceptance criteria:**
- [x] Validates hardware multiplier math on generated renewal invoices.
- [x] Flags subscriptions reaching expiry without an active renewal invoice.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/billing/RenewalSchedulerChecker.ts`
- `server/src/modules/system/sentinel/checkers/billing/RenewalSchedulerChecker.test.ts`

---

### Task 5.3: Implement `TaxAndNcfChecker` (BL-701)
**Description:** Audits billing invoices for exact 18% ITBIS tax calculation and valid DGII Series B01 sequential NCF voucher generation for clients with valid RNC/Cédula.
**Acceptance criteria:**
- [x] Validates `tax_amount == 0.18 * subtotal` (within 1 cent rounding).
- [x] Validates Modulo 11/10 RNC compliance and B01 NCF format.
- [x] Flags unvouchered invoices for eligible tax clients.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/billing/TaxAndNcfChecker.ts`
- `server/src/modules/system/sentinel/checkers/billing/TaxAndNcfChecker.test.ts`

---

### Task 5.4: Implement `NonPaymentEnforcementChecker` (BL-702)
**Description:** Asserts that overdue invoices strictly triggered the 4-tier non-payment scale: Day 1 (Notice), Day 5 (`READ_ONLY`), Day 15 (`SUSPENDED`), Day 30 (`PURGED`).
**Acceptance criteria:**
- [x] Asserts overdue tenants at Day 5 had write mutations blocked.
- [x] Asserts overdue tenants at Day 15 had portal access halted.
- [x] Flags overdue tenants maintaining unauthorized active write access.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/billing/NonPaymentEnforcementChecker.ts`
- `server/src/modules/system/sentinel/checkers/billing/NonPaymentEnforcementChecker.test.ts`

---

## Phase 6: Commissions, OpEx & Financial Checkers (BL-801, BL-802)

### Task 6.1: Implement `TechnicianBountyChecker` (BL-801)
**Description:** Verifies that technician-closed tickets generated exact priority-weighted commissions ($8 base * multiplier + $4 SLA bonus), auto-posted Pre-Split OpEx to `expenses`, held back 48h, voided upon ticket reopen, and paid $0 for automated resolutions.
**Acceptance criteria:**
- [x] Verifies commission formulas across all priorities.
- [x] Flags missing `expenses` OpEx records.
- [x] Asserts reopened tickets had earnings voided.
- [x] Asserts `RESOLVED_AUTOMATED` tickets received $0.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/financial/TechnicianBountyChecker.ts`
- `server/src/modules/system/sentinel/checkers/financial/TechnicianBountyChecker.test.ts`

---

### Task 6.2: Implement `ProfitSplitChecker` (BL-802)
**Description:** Audits net profit calculations: $\text{Net} = \text{Gross Paid Revenue} - \text{Total Deductible OpEx}$ (including technician bounties). Confirms HQ 70% / Lead Engineer 30% distribution math.
**Acceptance criteria:**
- [x] Audits periodic financial distributions for exact 70/30 split.
- [x] Flags OpEx omissions or incorrect dividend mathematics.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/financial/ProfitSplitChecker.ts`
- `server/src/modules/system/sentinel/checkers/financial/ProfitSplitChecker.test.ts`

---

## Phase 7: CRM & Account Health Checkers (BL-501, BL-601)

### Task 7.1: Implement `CrmPipelineChecker` (BL-501)
**Description:** Audits CRM lead state progressions (`NEW` -> `QUALIFIED` -> `PROPOSAL` -> `NEGOTIATION` -> `WON`/`LOST`) and verifies `WON` status auto-provisioned the client tenant.
**Acceptance criteria:**
- [x] Flags leads skipping pipeline stages without activity logs.
- [x] Confirms `WON` deals triggered tenant creation.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/crm_health/CrmPipelineChecker.ts`
- `server/src/modules/system/sentinel/checkers/crm_health/CrmPipelineChecker.test.ts`

---

### Task 7.2: Implement `AccountHealthChecker` (BL-601)
**Description:** Audits account health calculations ($H = 0.40 S_{\text{ticket}} + 0.30 S_{\text{hardware}} + 0.30 S_{\text{security}}$) and verifies score $< 70\%$ flagged a QBR review task.
**Acceptance criteria:**
- [x] Validates health score formula weighting.
- [x] Flags unreviewed accounts with health $< 70\%$.
- [x] Unit tests pass.
**Verification:**
- [x] Tests pass.
**Dependencies:** Task 1.1, Task 1.2
**Files touched:**
- `server/src/modules/system/sentinel/checkers/crm_health/AccountHealthChecker.ts`
- `server/src/modules/system/sentinel/checkers/crm_health/AccountHealthChecker.test.ts`

---

## Phase 8: Vitest Regression Synthesizer, Sentinel Orchestrator & Delivery

### Task 8.1: Implement `VitestRegressionSynthesizer`
**Description:** Translates any `InvariantViolation` across any of the 18 business rules into an isolated Vitest test file under `server/src/modules/<domain>/services/__tests__/regressions/`.
**Acceptance criteria:**
- [x] Supports generating regression tests for all 18 rules.
- [x] Generates clean, type-safe TypeScript mocking domain repositories and asserting expected domain errors or actions.
- [x] Synthesizer unit tests verify generated code formatting and compile correctness.
**Verification:**
- [x] Unit tests pass.
**Dependencies:** Phases 2-7
**Files touched:**
- `server/src/modules/system/sentinel/services/VitestRegressionSynthesizer.ts`
- `server/src/modules/system/sentinel/services/VitestRegressionSynthesizer.test.ts`

---

### Task 8.2: Implement `SequenceSentinelService` & Diagnostic Reporter
**Description:** Orchestrates parallel execution of all 18 checkers over aggregated sequences, produces a comprehensive Markdown diagnostic report in `docs/audits/`, and triggers test synthesis for critical violations.
**Acceptance criteria:**
- [x] Registers and coordinates all 18 domain checkers.
- [x] Generates Markdown report with executive summary, per-rule scorecard, and violation evidence tables.
- [x] Full unit test suite with mock dependencies.
**Verification:**
- [x] Unit tests pass.
**Dependencies:** Task 8.1
**Files touched:**
- `server/src/modules/system/sentinel/services/SequenceSentinelService.ts`
- `server/src/modules/system/sentinel/services/SequenceSentinelService.test.ts`

---

### Task 8.3: CLI Interface & MCP Tool Integration
**Description:** Expose SequenceSentinel as a CLI tool (`npm -w server run sentinel:audit`) and as an MCP tool `msp_run_sentinel_audit` on `packages/mcp-server`.
**Acceptance criteria:**
- [x] CLI script in `server/src/modules/system/sentinel/cli.ts` with `--hours`, `--generate-tests`, and `--tenant` flags.
- [x] MCP tool `msp_run_sentinel_audit` registered in `packages/mcp-server/src/serverFactory.ts`.
- [x] Clean build and passes test verification.
**Verification:**
- [x] `npm -w server run build` passes.
- [x] `npm run build:packages` passes.
**Dependencies:** Task 8.2
**Files touched:**
- `server/src/modules/system/sentinel/cli.ts`
- `server/package.json`
- `packages/mcp-server/src/tools/sentinelTools.ts`
- `packages/mcp-server/src/serverFactory.ts`
