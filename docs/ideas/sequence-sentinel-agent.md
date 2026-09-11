# SequenceSentinel: Autonomous Business Logic Integrity & Self-Healing Agent

## Problem Statement
How might we autonomously detect and remediate causal sequence drift and business logic inconsistencies between codified rules (`BL-101` through `BL-802`) and production database records, with zero human friction and strict circuit-breaker safety?

---

## Recommended Direction

A dedicated autonomous agent persona and skill located in `.agents/skills/sequence-sentinel/SKILL.md` paired with the existing MCP tool `msp_run_sentinel_audit` and CLI command `npm -w server run sentinel:audit`. 

The agent operates across three distinct modes:
1. **Continuous Passive Observation:** Non-locking temporal aggregation of PostgreSQL audit tables (`ticketEvents`, `technicianEarnings`, `expenses`, `invoices`, `subscriptions`, `rmmAlerts`, `leads`).
2. **Autonomous Remediation (Self-Healing):** Idempotent mutation handlers that resolve high-confidence operational inconsistencies (`BL-401` subscription reactivation, `BL-104` tier escalation, `BL-801` technician bounties, `BL-702` non-payment read-only enforcement) protected by a sliding 1-hour tenant circuit breaker (max 5 fixes/tenant/hour).
3. **Regression Test Synthesis:** Generating reproducible, type-safe Vitest specs (`*.spec.ts`) for discovered drift to expand the test baseline and guarantee zero regression.

---

## Key Assumptions to Validate
- [ ] **Idempotent State Machines:** All self-healing mutations can be executed repeatedly without generating duplicate expenses or corrupting state. (Validated via unit tests in `SelfHealingService.test.ts`).
- [ ] **Lock-Free Production Impact:** Sliding window queries on indexed timestamp columns (`created_at`, `paid_at`) will not impact production query performance. (Validated by non-locking select queries).
- [ ] **Circuit Breaker Liveness:** The 5-actions-per-tenant-per-hour ceiling prevents runaway cascades during upstream webhook outages while allowing normal day-to-day self-healing.

---

## MVP Scope

### What's In:
- Complete rule coverage across all 18 Master Business Logic specifications (`BL-101` to `BL-802`).
- 4 production self-healing remediators (`BL-401`, `BL-104`, `BL-801`, `BL-702`).
- Tenant-isolated sliding 1-hour circuit breaker.
- Clean Architecture orchestration via `SequenceSentinelService`.
- Multi-interface invocation: CLI, Express REST route, and MCP tool `msp_run_sentinel_audit`.
- Structured JSDoc, Winston logging, and Markdown diagnostic reports in `docs/audits/`.

### What's Out (Not Doing & Why):
- **Unbounded Auto-Remediation:** We deliberately refuse to allow unmetered automated writes; without circuit breakers, bad external payloads (e.g. infinite PayPal webhook loops) could overwhelm the database.
- **Destructive Purging Automation (`BL-702` Day 30):** While Day 5 `READ_ONLY` mode is auto-remediated, Day 30 data destruction (permanent Nextcloud deletion) requires explicit human technician sign-off.
- **Direct Ad-Hoc SQL Mutations:** The agent never executes raw SQL updates; all fixes flow strictly through Clean Architecture domain services and repositories.

---

## Open Questions & Future Extensions
- **Distributed Circuit Breaker:** Migrate from the in-memory `Map` to Redis (`CachePort`) when transitioning to multi-instance horizontal backend clusters.

---

## Canonical Engineering Guide
For step-by-step instructions on implementing new invariant checkers, self-healing remediators, and synthesized regression tests, see [sentinel-rule-recipe.md](../architecture/sentinel-rule-recipe.md).

