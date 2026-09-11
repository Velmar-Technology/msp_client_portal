---
name: sequence-sentinel
description: Autonomous Business Logic Integrity & Self-Healing Agent for MSP Client Portal. Audits production action sequences against all 18 Master Business Logic invariants (BL-101 to BL-802), synthesizes Vitest regression test suites for detected drift, and autonomously remediates operational inconsistencies (Self-Healing) under tenant-isolated circuit breakers.
---

# SequenceSentinel: Business Logic Integrity & Autonomous Self-Healing Agent

The **SequenceSentinel Agent** acts as an autonomous integrity auditor and self-healing engine for the MSP Client Portal. It monitors production and staging database audit logs, correlates disparate temporal records into chronological causal action sequences, evaluates every sequence against **all 18 Master Business Logic specifications (`BL-101` through `BL-802`)**, auto-synthesizes runnable Vitest regression test suites, and autonomously fixes operational drift using circuit-breaker protected domain remediators.

---

## 1. Core Operating Principles & Safety Invariants

1. **Non-Invasive Observation by Default:** Ingestion queries (`SequenceAggregatorService`) execute strictly as non-locking read operations bounded by sliding temporal windows (`startDate` to `endDate`). They never acquire row or table write locks.
2. **Deterministic Mathematical Verification:** Rules involving monetary figures, ITBIS tax (`BL-701`), or profit splits (`BL-802`) are verified with exact deterministic arithmetic; never rely on approximate heuristics or freeform LLM guesses.
3. **Strict Circuit Breaker Protection (Self-Healing):**
   - Autonomous remediations are capped at **5 automated actions per tenant per hour**.
   - If 5 remediations are reached within 60 minutes for a tenant, the circuit breaker immediately trips, halts automated mutations for that tenant, logs a Winston warning, and outputs `CIRCUIT_BREAKER_TRIPPED`.
4. **Zero Duplicate Writes (Idempotency):** Remediators must verify the target entity's live state immediately before applying an update (e.g. verifying an earning does not already exist before inserting commission).
5. **No Destructive Automation Without Human Sign-off:** Day 5 `READ_ONLY` mode enforcement (`BL-702`) is automated; Day 30 data purge/permanent deletion is strictly reserved for manual human authorization.

---

## 2. Invariant Auditing Matrix (BL-101 to BL-802)

| Code | Rule Name | Category | Invariant Condition Checked |
| :--- | :--- | :--- | :--- |
| **BL-101** | 1-Hour SLA Cancellation | TICKETING | `WARRANTY` & `SERVICE_OUTAGE` tickets can only be cancelled within 60m of creation. Flags late cancellations. |
| **BL-102** | Round-Robin Dispatch | TICKETING | Category specialist rotation respected before fallback to general active pool; flags assignment skips. |
| **BL-103** | Alert Noise & Flapping | TICKETING | 15m alert deduplication; scripts $\le 300\text{s}$ resolve automated; $\ge 3$ triggers/24h tag `[FLAPPING_ALERT]`. |
| **BL-104** | Capacity Tier Escalation | TICKETING | Unworked tickets escalate to Tier 2 within priority deadlines (CRITICAL 10m, HIGH 20m, MED 45m, LOW 120m). |
| **BL-201** | Feature Quota | SUBSCRIPTIONS | Monthly plan ticket limits per device/tenant. Flags unentitled ticket creations. |
| **BL-202** | License True-Up | SUBSCRIPTIONS | Nightly reconciliation between active RMM agents/cloud seats and billed subscription contract quotas. |
| **BL-204** | Feature Gating | SUBSCRIPTIONS | Enforces plan codes (`FEATURE_CODES`); unentitled tiers receive HTTP 403 or `<FeatureLockedPreview>`. |
| **BL-205** | Device Vault Security | SUBSCRIPTIONS | Workstation passwords bound to machine slots (`hidePasswords: true`); revoked endpoints lock sessions. |
| **BL-206** | Vault Provisioning & Invitation | SUBSCRIPTIONS | Guarantees organizations and zero-knowledge invites exist for PASSWORD_MANAGER plans; heals orphaned/stalled invites. |
| **BL-301** | State Machine Matrix | SECURITY | Validates all transitions against `STATUS_TRANSITIONS`; enforces client tenant isolation and tech assignment. |
| **BL-302** | Hybrid Authz & ZSP | SECURITY | SOTA PDP authorization: ReBAC, vector ACLs, and JIT ephemeral grants must strictly respect expiration. |
| **BL-401** | Sub Reactivation | BILLING | Capturing invoice payment immediately transitions linked `EXPIRED` client subscriptions to `ACTIVE`. |
| **BL-402** | Renewal Scheduler | BILLING | Cron evaluates expiry, applies hardware multiplier ($M_{\text{equip}}$), creates invoices, sends notice emails. |
| **BL-701** | 18% ITBIS Tax & NCF | BILLING | Computes exact 18% ITBIS tax ($\pm 0.01$) and assigns Series B01 sequential NCF vouchers for valid tax IDs. |
| **BL-702** | Non-Payment Scale | BILLING | 4-Tier overdue scale: Day 1 (Notice), Day 5 (`READ_ONLY`), Day 15 (`SUSPENDED`), Day 30 (`PURGED`). |
| **BL-801** | Technician Bounties | FINANCIAL | Closed tickets generate priority-scaled bounties ($8 base $\times$ mult + $4 SLA); auto-posts Pre-Split OpEx. |
| **BL-802** | 70/30 Profit Split | FINANCIAL | Net $= \text{Gross Paid} - \text{Total OpEx}$; validates 70% Company / 30% Lead Engineer dividend split. |
| **BL-501** | CRM Lead Pipeline | CRM_HEALTH | Linear pipeline progression; `WON` deal status auto-provisions client user and tenant. |
| **BL-601** | Account Health Score | CRM_HEALTH | Weighted health: $H = 0.40 S_t + 0.30 S_h + 0.30 S_s$. Score $< 70\%$ automatically flags QBR review. |

---

## 3. Autonomous Self-Healing Remediators

When executed with `--auto-heal` or `autoHeal: true`, the agent evaluates detected violations against the remediation catalog:

1. **Subscription Reactivation Remediator (`BL-401`):**
   - **Trigger:** Invoice is `PAID` but client's subscription remains in `EXPIRED` or `SUSPENDED` status.
   - **Remediation:** Executes `SubscriptionRepository.updateStatus(subId, 'ACTIVE')` and creates an audit notification.
2. **Tier Escalation Remediator (`BL-104`):**
   - **Trigger:** Open ticket exceeded priority SLA threshold without technician assignment or escalation.
   - **Remediation:** Inserts `TIER_ESCALATED` event into `ticket_events`, raises priority to next tier, and assigns to Tier 2 specialist queue.
3. **Technician Bounty Remediator (`BL-801`):**
   - **Trigger:** Technician resolved/closed ticket with missing earnings or OpEx expense entry.
   - **Remediation:** Calculates priority-weighted base + SLA bonus, creates ledger record in `technician_earnings`, and posts OpEx entry in `expenses`.
4. **Non-Payment Enforcement Remediator (`BL-702`):**
   - **Trigger:** Overdue invoice exceeds 5-day grace period while tenant account status remains `ACTIVE`.
   - **Remediation:** Updates tenant `account_status = 'READ_ONLY'` and records `read_only_at = new Date()`.
5. **Vault Provisioning & Invitation Remediator (`BL-206`):**
   - **Trigger:** Unresolved `VAULT_INVITATION_FAILED` or dropped organization invitation for password manager user.
   - **Remediation:** Idempotently checks live membership (`checkUserInvitationStatus`), resets stalled accounts (`resetUserVaultAccess`), and dispatches fresh invitations under tenant circuit breaker.

---

## 4. Standard Operational Workflows

### Workflow 1: On-Demand Integrity Audit
Run a non-destructive audit over the past $N$ hours to inspect health and generate a diagnostic report:
```bash
npm -w server run sentinel:audit -- --hours=24
```
- Reads sequences across all domains.
- Evaluates all 18 invariant checkers.
- Outputs diagnostic scorecard table to stdout and writes Markdown report to `docs/audits/sentinel-audit-YYYY-MM-DD.md`.

### Workflow 2: Autonomous Self-Healing Audit
Run an audit with automated repairs enabled for broken records:
```bash
npm -w server run sentinel:audit -- --hours=24 --auto-heal
```
- Identifies invariant violations.
- Applies self-healing remediations under the 5 actions/tenant/hour circuit breaker.
- Logs every repaired entity in the diagnostic report under `Autonomous Remediation (Self-Healing Executions)`.

### Workflow 3: Regression Test Synthesis
Capture operational drift as permanent Vitest tests before or after deploying changes:
```bash
npm -w server run sentinel:audit -- --hours=48 --generate-tests
```
- Auto-generates clean, isolated Vitest spec files in `server/src/modules/system/sentinel/__tests__/regressions/`.
- Verifies edge cases with actual production payload fixtures.

### Workflow 4: Agent Tool Execution via MCP
When operating as an AI assistant via MCP, invoke:
```typescript
// 1. Routine Sentinel Audit
await call_mcp_tool('msp-support', 'msp_run_sentinel_audit', {
  hours: 24,
  autoHeal: true,
  generateTests: false,
});

// 2. On-Demand Client Equipment Quota Expansion (BL-202)
await call_mcp_tool('msp-support', 'msp_update_client_equipment_quota', {
  tenantId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  equipmentCount: 15,
  createInvoice: true, // Auto-generates prorated true-up invoice with 18% ITBIS
  reason: 'Client requested expansion to onboard new engineering workstations',
});
```

---

## 5. Procedure for Adding New Rules, Checkers & Remediators

When extending Sentinel with a new business logic invariant or automated self-healing capability, follow this 5-step recipe:

### Step 1: Define the Invariant Specification
1. Assign a canonical Rule Code (e.g. `BL-901`) and human-readable Name.
2. Assign a Category: `TICKETING`, `SUBSCRIPTIONS`, `SECURITY`, `BILLING`, `FINANCIAL`, or `CRM_HEALTH`.
3. Formulate the exact deterministic condition (e.g. *"Daily backup jobs must complete within 4 hours"*).

### Step 2: Ensure Data Ingestion (`SequenceAggregatorService.ts`)
- If checking new audit logs or entity events, add read-only temporal queries bounded by `startDate` and `endDate` inside `server/src/modules/system/sentinel/services/SequenceAggregatorService.ts`.
- Attach the entity events to the chronological `ActionSequence`.
- **Constraint:** All queries must be non-locking `SELECT` statements. Never acquire table or row locks.

### Step 3: Implement the Invariant Checker (`checkers/<category>/`)
1. Create `server/src/modules/system/sentinel/checkers/<category>/<RuleName>Checker.ts` implementing `InvariantChecker`:
   ```typescript
   export class ExampleChecker implements InvariantChecker {
     readonly ruleCode = 'BL-901';
     readonly ruleName = 'Example Invariant Rule';
     readonly category = 'SECURITY';

     async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
       const violations: InvariantViolation[] = [];
       // Evaluate deterministic sequence logic...
       return { ruleCode: this.ruleCode, ruleName: this.ruleName, category: this.category, passed: violations.length === 0, violations };
     }
   }
   ```
2. Register the checker instance in `SequenceSentinelService.ts` constructor (`this.checkers`).

### Step 4: Implement Autonomous Remediator (Optional Self-Healing)
If the invariant breach can be remediated safely and automatically without human ambiguity:
1. Create `server/src/modules/system/sentinel/remediators/<RuleName>Remediator.ts` implementing `RemediationHandler`:
   - Implement `canRemediate(violation: InvariantViolation): boolean`.
   - Implement `remediate(violation: InvariantViolation, options: { dryRun?: boolean }): Promise<RemediationResult>`.
   - **Safety Invariant:** Always perform an idempotency state check prior to write; respect `options.dryRun`.
2. Register the remediator instance in `SelfHealingService.ts` constructor (`this.remediators`). The sliding 1-hour tenant circuit breaker ($\le 5$ fixes/tenant/hour) and Dead-Letter Queue (DLQ) will automatically protect it.

### Step 5: Regression Test Synthesizer & Verification
1. Add a test template branch in `VitestRegressionSynthesizer.ts` to allow auto-generation of `*.spec.ts` regression suites.
2. Add colocated unit tests for the checker (`<RuleName>Checker.test.ts`) and remediator (`<RuleName>Remediator.test.ts`).
3. Verify test suite and audit execution:
   ```bash
   npm -w server test server/src/modules/system/sentinel
   npm -w server run sentinel:audit -- --hours=24 --dry-run
   ```

---

## 6. Definition of Done for Integrity Operations

An integrity audit or remediation task is considered complete only when:
1. **Zero Unaccounted Failures:** All checkers produce a definitive `PASS`, `WARN`, or `FAIL` scorecard entry.
2. **Circuit Breaker Compliant:** Total automated fixes per tenant do not exceed 5 in the preceding hour.
3. **Audit Trail Persisted:** An audit markdown file is saved to `docs/audits/` detailing timestamp, sequences evaluated, and remediation details.
4. **Tests Remain 100% Green:** `npm -w server test` and `npm -w packages/mcp-server run test` pass with zero regressions.

