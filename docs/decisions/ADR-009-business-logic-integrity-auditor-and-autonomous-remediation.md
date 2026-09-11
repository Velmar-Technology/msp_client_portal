# ADR-009: Passive Action Sequence Auditing, Business Logic Invariant Verification (BL-101 to BL-802) & Autonomous Self-Healing Remediation

## Status
Accepted

## Date
2026-09-11

## Context
The MSP Client Portal codifies 18 Master Business Logic rules (`BL-101` through `BL-802` in `AGENTS.md`) spanning multiple asynchronous and event-driven subsystems: ticketing SLA windows, technician dispatch round-robin, RMM alert flapping, plan quotas, license true-ups, device-bound credential isolation, RBAC state machines, SOTA hybrid authorization with JIT grants, subscription reactivation, DGII 18% ITBIS tax with B01 NCF vouchers, overdue non-payment scales, technician bounties, and net profit splits.

While unit and integration test suites enforce these constraints at build time in isolation, operational environments introduce divergence vectors:
1. **Asynchronous Webhook & Gateway Timing:** Delayed PayPal captures, external provider retries, or transient network timeouts can lead to state desynchronization (e.g. invoice marked `PAID` while linked subscription remains `EXPIRED`, violating BL-401).
2. **Cron Job & Worker Skew:** Renewal schedules, non-payment delinquency escalation, or background auto-remediation scripts can fail mid-execution due to database restarts or deadlocks.
3. **Out-of-Band Database Mutations:** Staging seed scripts, manual support fixes, or third-party integrations can bypass application-level service guards and corrupt invariant causal sequences.
4. **Diagnostic Delay & Manual Remediation Overhead:** Detecting and fixing these faults previously required human log analysis, manual SQL updates, and ad-hoc script authoring without circuit breakers.

---

## Decision

We implement **SequenceSentinel** (`server/src/modules/system/sentinel/`), a dual-mode integrity auditing and autonomous self-healing subsystem pairing non-invasive temporal causal reconstruction with modular invariant checking, automatic TDD regression test synthesis, and circuit-breaker protected remediation:

```
[ PostgreSQL Audit Tables (ticketEvents, expenses, invoices, subscriptions, rmmAlerts, leads) ]
                                   │
                                   ▼ (Read-Only Non-Locking Temporal Slice)
                   [ SequenceAggregatorService ]
                                   │
                                   ▼ (Reconstructed Action Sequences)
            ┌──────────────────────┴──────────────────────┐
            ▼                                             ▼
 ┌───────────────────────────────┐             ┌───────────────────────────────┐
 │ 18 Invariant Checkers         │             │ Vitest Regression Synthesizer │
 │ (BL-101 through BL-802)       │             │ (Auto-generates *.spec.ts)    │
 └───────────────────────────────┘             └───────────────────────────────┘
            │                                             │
            ▼                                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ SequenceSentinelService (Orchestrator & Diagnostic Reports) │
 └─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ (If --auto-heal enabled)
 ┌─────────────────────────────────────────────────────────────┐
 │ SelfHealingService (Sliding 1h Window Circuit Breaker)      │
 │ ├── SubscriptionReactivationRemediator (BL-401)             │
 │ ├── TierEscalationRemediator (BL-104)                       │
 │ ├── TechnicianBountyRemediator (BL-801)                     │
 │ └── NonPaymentEnforcementRemediator (BL-702)                │
 └─────────────────────────────────────────────────────────────┘
```

### 1. Non-Invasive Temporal Sequence Aggregation (`SequenceAggregatorService`)
- Operates entirely on read-only temporal queries bounded by `startDate` and `endDate` without acquiring row or table-level locks.
- Groups events across entities (`TICKET`, `INVOICE`, `SUBSCRIPTION`, `DEVICE`, `LEAD`) into chronologically ordered `ActionSequence` objects with full root context.

### 2. Modular Invariant Checkers (`checkers/`)
- All checkers implement a unified `InvariantChecker` interface:
  ```typescript
  export interface InvariantChecker {
    readonly ruleCode: string;
    readonly ruleName: string;
    readonly category: 'TICKETING' | 'SUBSCRIPTIONS' | 'SECURITY' | 'BILLING' | 'FINANCIAL' | 'CRM_HEALTH';
    evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult>;
  }
  ```
- Evaluates 100% of the 18 Master Business Logic rules in parallel via `Promise.all` over in-memory sequence graphs, eliminating N+1 database queries during rule verification.

### 3. Vitest Regression Synthesizer (`VitestRegressionSynthesizer`)
- Automatically translates any detected `InvariantViolation` into an isolated, executable Vitest test suite (`services/__tests__/regressions/*.spec.ts`).
- Generates reproducible evidence fixtures capturing operational state at violation time, enabling immediate TDD reproduction.

### 4. Autonomous Self-Healing & Tenant Circuit Breakers (`SelfHealingService`)
- Implements targeted, idempotent domain remediators:
  - `SubscriptionReactivationRemediator` (`BL-401`): Transitions `EXPIRED` client subscriptions to `ACTIVE` when paid invoices exist.
  - `TierEscalationRemediator` (`BL-104`): Dispatches `TIER_ESCALATED` events and elevates priority for unworked tickets past SLA.
  - `TechnicianBountyRemediator` (`BL-801`): Ledgers missing closed-ticket bounties in `technicianEarnings` and auto-posts Pre-Split OpEx in `expenses`.
  - `NonPaymentEnforcementRemediator` (`BL-702`): Places Day 5+ overdue tenants in `READ_ONLY` mode.
- **Circuit Breaker Policy:** Enforces a hard limit of **5 automated remediations per tenant per hour**. If exceeded, further mutations are blocked, logged as warnings in Winston, and reported as `CIRCUIT_BREAKER_TRIPPED` to protect production stability against runaway cascading mutations.

### 5. Multi-Interface Delivery
1. **CLI Script:** `npm -w server run sentinel:audit -- [--hours=24] [--generate-tests] [--auto-heal] [--tenant=<uuid>]`
2. **Backend API Route:** `POST /api/v1/system/sentinel/audit` guarded by `authMiddleware` and RBAC (`ADMIN`, `TECHNICIAN`).
3. **MCP Tool Integration:** `msp_run_sentinel_audit` exposed via `@msp/mcp-server` for autonomous agent invocation.

---

## Alternatives Considered

### 1. Synchronous Inline Validation (Pre/Post-Conditions on Every Mutation)
- **Pros:** Prevents violations at write time.
- **Cons:** Increases transactional latency, causes lock contention across distributed services, and cannot detect omissions caused by missing webhooks, clock skew, or background worker failures.
- **Verdict:** Rejected as a replacement; used alongside inline domain rules as an out-of-band verification layer.

### 2. Ad-hoc Periodic SQL Cron Scripts
- **Pros:** Simple to schedule in PostgreSQL `pg_cron`.
- **Cons:** Direct SQL scripts lack domain error types, bypass application events and email notifications, cannot auto-synthesize Vitest regression specs, and lack tenant circuit breakers.
- **Verdict:** Rejected in favor of Clean Architecture TypeScript services.

### 3. Unconstrained LLM-Based Log Analysis
- **Pros:** Flexible reasoning over raw text logs.
- **Cons:** Non-deterministic; unable to mathematically guarantee exact 18% ITBIS tax calculations (`BL-701`) or 70/30 profit split equations (`BL-802`); poses security risks if allowed to mutate database state without deterministic guardrails.
- **Verdict:** Rejected in favor of deterministic invariant checkers and structured remediation handlers.

---

## Consequences & Operational Guarantees

- **Guaranteed Coverage:** Every Master Business Logic specification (`BL-101` to `BL-802`) is continuously verifiable with zero manual overhead.
- **Zero Risk of Runaway Loops:** The tenant circuit breaker guarantees that no buggy trigger or upstream external outage (e.g. PayPal webhook loop) can cause runaway updates.
- **Human-in-the-Loop Transparency:** Markdown reports in `docs/audits/` and structured Winston logs record every audited sequence, violation evidence, and remediation result.
- **Idempotency:** Remediators verify current state before executing writes, ensuring zero duplicate commissions or double invoicing.
