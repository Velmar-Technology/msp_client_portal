# Canonical Sentinel Rule Recipe (Integrity Checkers & Autonomous Remediators)

This document defines the canonical engineering recipe for adding or extending business logic invariant checkers, autonomous self-healing remediators, and regression test synthesizers in the **SequenceSentinel** subsystem (`server/src/modules/system/sentinel/`).

---

## High-Level Architecture Overview

```
[ Ingestion Layer: SequenceAggregatorService ]
                 │
                 ▼ (Chronological ActionSequence[] Graph)
   ┌─────────────┴───────────────────────────────┐
   │                                             │
   ▼                                             ▼
[ InvariantChecker Interface ]       [ VitestRegressionSynthesizer ]
   │ (evaluate() in parallel)                    │ (Auto-generates *.spec.ts)
   ▼                                             ▼
[ InvariantViolation[] ] ──────────► [ Test Suite Output ]
   │
   ▼
[ SelfHealingService ]
   │ (Protected by sliding 1h Tenant Circuit Breaker: <= 5 fixes/tenant/hr)
   ▼
[ RemediationHandler Interface ]
   │ (Idempotent state check -> Domain Service/Repository update)
   ▼
[ System Restored to Valid State ]
```

---

## The 5-Step Vertical Slice for Sentinel

### Step 1: Invariant Rule Specification
Every invariant rule in the Sentinel catalog must be formally defined:
1. **Rule Code:** Unique uppercase identifier (e.g. `BL-901`, `BL-902`).
2. **Rule Name:** Descriptive name (e.g. `Backup Completion SLA Verification`).
3. **Category:** One of the supported domain categories:
   - `TICKETING`
   - `SUBSCRIPTIONS`
   - `SECURITY`
   - `BILLING`
   - `FINANCIAL`
   - `CRM_HEALTH`
4. **Invariant Invariant Logic:** Deterministic mathematical or state assertion (e.g. `endedAt - startedAt <= 4 * 3600 * 1000`).

---

### Step 2: Temporal Ingestion in `SequenceAggregatorService`
If the new invariant verifies data from an audit table or domain not yet aggregated:
1. Open `server/src/modules/system/sentinel/services/SequenceAggregatorService.ts`.
2. Add a non-locking query bounded by the temporal window (`startDate` to `endDate`):
   ```typescript
   // Example query within the sliding window
   const records = await db.query.backupJobs.findMany({
     where: and(
       gte(backupJobs.createdAt, window.startDate),
       lte(backupJobs.createdAt, window.endDate),
       window.tenantId ? eq(backupJobs.tenantId, window.tenantId) : undefined
     ),
   });
   ```
3. Map the records into `ActionSequence` events with chronological timestamps.
4. **Constraint:** Never acquire row or table write locks during aggregation.

---

### Step 3: Implement the `InvariantChecker`
1. Create a new checker in `server/src/modules/system/sentinel/checkers/<category>/<RuleName>Checker.ts`.
2. Implement the `InvariantChecker` interface:
   ```typescript
   import {
     ActionSequence,
     InvariantChecker,
     InvariantCheckResult,
     InvariantViolation,
   } from '../../types';

   export class BackupCompletionChecker implements InvariantChecker {
     readonly ruleCode = 'BL-901';
     readonly ruleName = 'Backup Completion SLA Verification';
     readonly category = 'SECURITY';

     async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
       const violations: InvariantViolation[] = [];

       for (const seq of sequences) {
         // Evaluate deterministic condition over the sequence
         if (seq.entityType === 'BACKUP_JOB' && this.isBreached(seq)) {
           violations.push({
             ruleCode: this.ruleCode,
             ruleName: this.ruleName,
             severity: 'HIGH',
             tenantId: seq.tenantId,
             entityId: seq.entityId,
             entityType: seq.entityType,
             description: `Backup job ${seq.entityId} exceeded allowable completion window`,
             timestamp: new Date().toISOString(),
             details: { ...seq.metadata },
           });
         }
       }

       return {
         ruleCode: this.ruleCode,
         ruleName: this.ruleName,
         category: this.category,
         passed: violations.length === 0,
         violations,
       };
     }

     private isBreached(seq: ActionSequence): boolean {
       // Deterministic arithmetic / state logic
       return false;
     }
   }
   ```
3. Register the checker in `server/src/modules/system/sentinel/services/SequenceSentinelService.ts`:
   ```typescript
   import { BackupCompletionChecker } from '../checkers/security/BackupCompletionChecker';

   // Inside constructor():
   this.checkers = customCheckers || [
     // ... existing checkers ...
     new BackupCompletionChecker(),
   ];
   ```

---

### Step 4: Implement Autonomous Self-Healing (`RemediationHandler`) [Optional]
If the rule can be automatically healed with high confidence and zero human ambiguity:
1. Create `server/src/modules/system/sentinel/remediators/<RuleName>Remediator.ts`.
2. Implement `RemediationHandler`:
   ```typescript
   import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';

   export class BackupCompletionRemediator implements RemediationHandler {
     readonly ruleCode = 'BL-901';

     canRemediate(violation: InvariantViolation): boolean {
       return violation.ruleCode === this.ruleCode;
     }

     async remediate(
       violation: InvariantViolation,
       options: { dryRun?: boolean } = {}
     ): Promise<RemediationResult> {
       if (options.dryRun) {
         return {
           success: true,
           actionTaken: `DRY_RUN: Simulated restart of stale backup job ${violation.entityId}`,
         };
       }

       // 1. Mandatory Idempotency Check: Verify target live state in database
       // 2. Perform restorative mutation via Domain Service / Repository
       // 3. Return structured result
       return {
         success: true,
         actionTaken: `Restarted stalled backup job ${violation.entityId}`,
       };
     }
   }
   ```
3. Register the remediator in `server/src/modules/system/sentinel/services/SelfHealingService.ts`:
   ```typescript
   import { BackupCompletionRemediator } from '../remediators/BackupCompletionRemediator';

   // Inside constructor():
   const handlers = customRemediators || [
     // ... existing remediators ...
     new BackupCompletionRemediator(),
   ];
   ```
4. **Safety Guarantees automatically applied by `SelfHealingService`:**
   - **Circuit Breaker:** Max 5 auto-fixes per tenant per sliding 1-hour window.
   - **Dead-Letter Queue (DLQ):** Trips or failures are pushed to in-memory DLQ for human inspection.
   - **Dry Run Support:** When invoked with `dryRun: true`, no database writes occur.

---

### Step 5: Regression Test Synthesizer Integration
1. In `server/src/modules/system/sentinel/services/VitestRegressionSynthesizer.ts`, add a template generator for `BL-XXX`.
2. When Sentinel runs with `--generate-tests`, it will automatically write a standalone, runnable `server/src/modules/system/sentinel/__tests__/regressions/blXXX_*.spec.ts` test recreating the exact sequence.

---

## Verification & Testing Quality Gates

Every new checker and remediator must satisfy:

```bash
# 1. Run Sentinel module test suite
npm -w server test server/src/modules/system/sentinel

# 2. Run an audit dry run
npm -w server run sentinel:audit -- --hours=24 --dry-run

# 3. Verify MCP server tests pass
npm -w packages/mcp-server run test
```

---

## Summary of Golden Rules for Sentinel
1. **Deterministic Verification:** Always use exact deterministic logic or arithmetic; never use fuzzy heuristics for financial, tax, or SLA rules.
2. **Read-Only Aggregation:** Ingestion must never acquire table/row locks or interfere with production traffic.
3. **Check Live State Before Healing:** Remediators must verify the entity's current state immediately prior to mutating.
4. **Respect the Circuit Breaker:** Never bypass the 5-remediations-per-tenant-per-hour limit.
5. **No Destructive Automation Without Human Sign-Off:** Data deletion/purging (e.g. `BL-702` Day 30) is strictly reserved for human technician approval.
