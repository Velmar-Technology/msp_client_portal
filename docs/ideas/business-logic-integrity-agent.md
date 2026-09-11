# Idea Refinement: SequenceSentinel (Production Business Logic Integrity & Test-Synthesizing Agent)

## Problem Statement
How might we passively audit production action sequences against codified business logic (BL-101 through BL-802) so that specification drift, security boundary anomalies, and operational bottlenecks are automatically surfaced as actionable diagnostic reports and runnable Vitest regression specs?

## Recommended Direction: Passive Sequence & Event Auditor ("SequenceSentinel")
Build **SequenceSentinel**, a non-invasive, read-only auditing agent and CLI tool integrated directly into the workspace monorepo. Instead of executing risky dummy mutations against live production environments, SequenceSentinel acts as an **auditing flight recorder**:

1. **Passive Event & Sequence Reconstruction:**
   - Reads historical action sequences over a sliding temporal window (e.g. 24 hours) from PostgreSQL audit tables (`ticketEvents`, `technicianEarnings`, `invoices`, `expenses`, `rmmAlerts`, `deviceMaintenances`) and structured Winston JSON logs (`requestId`, `tenantId`, `userId`, `traceId`).
   - Chronologically correlates actions into canonical data journeys (e.g. `Ticket Creation -> Auto-Dispatch -> SLA Timer -> Cancellation / Resolution -> Bounty Calculation -> OpEx Posting`).

2. **Multi-Axis Invariant Rule Engines:**
   - **Business Logic Invariants (BL-101 to BL-802):**
     - **BL-101 (1-Hour SLA Cancellation):** Asserts that any `WARRANTY` or `SERVICE_OUTAGE` tickets cancelled were within the 60-minute window of creation.
     - **BL-103 / BL-104 (Noise & Tier Escalation):** Confirms flapping alerts (>=3 triggers in 24h) were tagged `[FLAPPING_ALERT]` and unworked tickets escalated to Tier 2 within priority deadlines (P1 10m, P2 20m, P3 45m, P4 120m).
     - **BL-201 (Feature Quota):** Asserts monthly ticket counts did not exceed subscription plan limits.
     - **BL-702 (4-Tier Non-Payment):** Verifies accounts with overdue invoices had write mutations blocked (`READ_ONLY` Day 5) or access halted (`SUSPENDED` Day 15).
     - **BL-801 (Technician Commissions & OpEx):** Validates that every non-automated closed ticket generated the exact priority-weighted commission ($8 base * multiplier + $4 SLA bonus) and posted to `expenses`.
     - **BL-802 (70/30 Profit Split):** Validates net pool mathematics against total deductible OpEx.
   - **Security & Authorization Boundaries (BL-301 / BL-302):**
     - Audits access logs for cross-tenant query attempts, unauthenticated API key invocations, or expired JIT ephemeral grants that remained active.
   - **Operational Friction & Recovery:**
     - Identifies stalled workflows, failed webhook retries, and dispatch bottlenecks.

3. **Autonomous Vitest Spec Synthesizer ("Log-to-Vitest"):**
   - When SequenceSentinel detects a state invariant violation, it doesn't just print a generic error log.
   - It synthesizes a dedicated, isolated test file under `server/src/modules/<domain>/services/__tests__/regressions/` mocking the exact input parameters, timestamps, and database state that produced the failure.
   - Developers and agents can immediately run `npm -w server run test` to reproduce the bug in a local sandbox, implement the fix using TDD, and commit without guesswork.

## Key Assumptions to Validate
- [ ] **Data Completeness:** Existing tables (`ticketEvents`, `technicianEarnings`, `expenses`) and Winston logs retain enough relational sequence keys (`tenantId`, `traceId`, previous status) to reconstruct complete causal chains.
- [ ] **Read Performance:** Auditing queries over indexed timestamp windows can execute with zero performance impact or read-lock contention on the operational database.
- [ ] **Clean Architecture Compliance:** Synthesized Vitest tests strictly use domain entities, constructor injection, and typed domain errors from `@shared/errors`, without requiring ad-hoc manual refactoring.

## MVP Scope
1. **Sequence Reconstructor Engine (`server/src/modules/system/sentinel/`):**
   - Chronological event aggregator grouping events by `ticketId`, `tenantId`, and `invoiceId`.
2. **Phase 1 Invariant Checkers:**
   - `SlaCancellationChecker` (`BL-101`)
   - `TierEscalationChecker` (`BL-104`)
   - `TechnicianBountyChecker` (`BL-801`)
3. **Vitest Regression Synthesizer:**
   - Code generator template that writes clean, self-contained Vitest specs for detected violations.
4. **Audit Reporter & CLI Interface:**
   - CLI command `npm -w server run sentinel:audit` outputting a structured Markdown diagnostic summary to `docs/audits/`.

## Not Doing (and Why)
- **Not mutating live production data:** Avoids synthetic tenant pollution, risk of accidental customer billing, or test data leaking into client dashboards.
- **Not auto-merging PRs:** Preserves human-in-the-loop governance; engineers review the generated reproduction test and approve the domain service patch.
- **Not replacing APM / Sentry:** Focuses strictly on domain state transitions and business logic integrity, not infrastructure CPU or memory metrics.

## Open Questions
- Should the audit run via nightly GitHub Actions / Portainer cron, or be triggered on-demand by developers / support agents via MCP?
- Should we provide an MCP tool (`msp_run_sentinel_audit`) so the MSP Support Agent can trigger diagnostic runs directly?
