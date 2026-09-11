# SequenceSentinel Architecture & Master Plan: Full Business Logic Coverage (BL-101 to BL-802)

## Architectural Overview
SequenceSentinel is a non-invasive, read-only sequence and business logic auditor located in `server/src/modules/system/sentinel/`. It reads production and staging database audit logs (`ticketEvents`, `tickets`, `rmmAlerts`, `technicianEarnings`, `expenses`, `invoices`, `subscriptions`, `tenants`, `users`), chronologically correlates them into multi-step causal action sequences, evaluates every sequence against all 18 Master Business Logic specifications (`BL-101` through `BL-802`), and automatically synthesizes isolated Vitest reproduction specs (`*.spec.ts`) for any detected drift.

```
[ PostgreSQL Audit Tables (ticketEvents, expenses, invoices, subscriptions, etc.) ]
                                  │
                                  ▼ (Read-Only Temporal Slice)
                  [ SequenceAggregatorService ]
                                  │
                                  ▼ (Chronological Action Sequences)
           ┌──────────────────────┴──────────────────────┐
           ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ Ticketing & SLA Suite         │             │ Billing & Tax Suite           │
│ - BL-101: SlaCancellation     │             │ - BL-401: SubReactivation     │
│ - BL-102: RoundRobinDispatch  │             │ - BL-402: RenewalScheduler    │
│ - BL-103: AlertNoiseFlapping  │             │ - BL-701: TaxAndNcf           │
│ - BL-104: TierEscalation      │             │ - BL-702: NonPaymentScale     │
└───────────────────────────────┘             └───────────────────────────────┘
           │                                             │
           ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ Subscriptions & Equipment     │             │ Commissions & Financials      │
│ - BL-201: QuotaEnforcement    │             │ - BL-801: TechBountyOpEx      │
│ - BL-202: LicenseTrueUp       │             │ - BL-802: ProfitSplit         │
│ - BL-204: FeatureGating       │             │                               │
│ - BL-205: DeviceVaultSecurity │             │ CRM & Health Suite            │
└───────────────────────────────┘             │ - BL-501: CrmLeadPipeline     │
           │                                  │ - BL-601: AccountHealthScore  │
           ▼                                  └───────────────────────────────┘
┌───────────────────────────────┐                        │
│ Security & State Machine      │                        │
│ - BL-301: StateMachine        │                        │
│ - BL-302: AuthzAndJit         │                        │
└───────────────────────────────┘                        │
           │                                             │
           └──────────────────────┬──────────────────────┘
                                  ▼
                   [ SequenceSentinelService ]
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
   [ Markdown Diagnostic Report ]    [ VitestRegressionSynthesizer ]
   (`docs/audits/audit-*.md`)        (`services/__tests__/regressions/*.spec.ts`)
```

## Modular Checker Registry
All checkers implement a unified `InvariantChecker` interface:
```typescript
export interface InvariantChecker {
  readonly ruleCode: string; // e.g. "BL-101"
  readonly ruleName: string;
  readonly category: 'TICKETING' | 'SUBSCRIPTIONS' | 'SECURITY' | 'BILLING' | 'FINANCIAL' | 'CRM_HEALTH';
  evaluate(sequence: ActionSequence): Promise<InvariantCheckResult>;
}
```

## Dependency Graph
1. **Core Types & Interfaces** (`server/src/modules/system/sentinel/types.ts`)
   - Pure domain models (`ActionSequence`, `InvariantViolation`, `AuditReport`).
2. **Aggregator Engine** (`server/src/modules/system/sentinel/services/SequenceAggregatorService.ts`)
   - Read-only Drizzle queries grouped by entity IDs (`ticketId`, `tenantId`, `invoiceId`).
3. **Domain Checker Suites** (`server/src/modules/system/sentinel/checkers/`):
   - `ticketing/`: `SlaCancellationChecker`, `RoundRobinDispatchChecker`, `AlertNoiseFlappingChecker`, `TierEscalationChecker`.
   - `subscriptions/`: `QuotaEnforcementChecker`, `LicenseTrueUpChecker`, `FeatureGatingChecker`, `DeviceVaultSecurityChecker`.
   - `security/`: `StateMachineChecker`, `AuthorizationAndJitChecker`.
   - `billing/`: `SubscriptionReactivationChecker`, `RenewalSchedulerChecker`, `TaxAndNcfChecker`, `NonPaymentEnforcementChecker`.
   - `financial/`: `TechnicianBountyChecker`, `ProfitSplitChecker`.
   - `crm_health/`: `CrmPipelineChecker`, `AccountHealthChecker`.
4. **Vitest Regression Synthesizer** (`server/src/modules/system/sentinel/services/VitestRegressionSynthesizer.ts`)
   - Code generator outputting Clean Architecture `*.spec.ts` files with mock dependencies.
5. **Orchestrator, CLI & MCP Tool**
   - `SequenceSentinelService.ts`
   - `cli.ts` (`npm -w server run sentinel:audit`)
   - MCP tool `msp_run_sentinel_audit` in `packages/mcp-server`
