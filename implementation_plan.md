# Pillar 1 — Service Delivery & Automation Logic Implementation Plan

This plan details the implementation of Pillar 1 operational optimizations for the MSP Client Portal backend service delivery engine:
1. **Flapping Detection & Escalation Engine (`AlertService.processRMMAlert`)**: Rolling 24-hour window tracking per asset. Flapping alerts ($\ge 3$ triggers in 24h) bypass auto-closure, set status to `OPEN`, category to `PREVENTATIVE_MAINTENANCE`, apply `FLAPPING_ALERT` tag, and assign directly to Tier 2.
2. **Dynamic Priority-Based SLA Escalation (`TicketService.enforceEscalation`)**: Priority-weighted escalation thresholds ($T_{\text{esc}}$: P1=10m, P2=20m, P3=45m, P4=120m).
3. **Capacity-Weighted Technician Routing (`AssignmentService`)**: Active Load Factor ($L_k$) calculation minimizing weighted open ticket load ($\text{P1}=4.0, \text{P2}=2.0, \text{P3}=1.0, \text{P4}=0.5$) with a 15.0 capacity threshold fallback.
4. **Key Performance Indicators (KPIs)**: Formulated metrics for Noise Reduction Ratio ($NRR$), Self-Healing Efficiency ($SHE$), and Automated First Contact Resolution ($FCR_A$).

---

## User Review Required

> [!IMPORTANT]
> **Schema & Enum Expansions**:
> - Enums `TicketStatus` and `TicketCategory` will be updated in [types/index.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/types/index.ts) and [schema.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/db/schema.ts) to include `RESOLVED_AUTOMATED` (for auto-closed self-healing tickets) and `PREVENTATIVE_MAINTENANCE` (for flapping alert ticket categorization).
> - Default technician routing strategy will switch to `CapacityWeightedAssignmentStrategy` while preserving `RoundRobinAssignmentStrategy` capability.

---

## Proposed Changes

### Entities & Data Access Layer

#### [MODIFY] [index.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/types/index.ts)
- Add `RESOLVED_AUTOMATED = 'RESOLVED_AUTOMATED'` to `TicketStatus` enum.
- Add `PREVENTATIVE_MAINTENANCE = 'PREVENTATIVE_MAINTENANCE'` to `TicketCategory` enum.

#### [MODIFY] [schema.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/db/schema.ts)
- Add `'RESOLVED_AUTOMATED'` to `ticketStatusEnum`.
- Add `'PREVENTATIVE_MAINTENANCE'` to `ticketCategoryEnum`.

#### [MODIFY] [TicketRepository.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/repositories/TicketRepository.ts)
- Add `findOpenTicketsForTechnicians(techIds: string[])` to query all open/active tickets assigned to candidate technicians.

---

### Service Layer

#### [MODIFY] [AssignmentStrategy.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/strategies/AssignmentStrategy.ts)
- Update `IAssignmentStrategy` to accept optional `priority?: TicketPriority`.
- Implement `CapacityWeightedAssignmentStrategy`:
  - Calculate load factor $L_k = \sum_{j \in \text{OpenTickets}_k} \text{Weight}(\text{Priority}_j)$ where P1=4.0, P2=2.0, P3=1.0, P4=0.5.
  - Route to specialist technician where $L_k$ is minimized.
  - If $L_k > 15.0$ for all specialists in the pool, log a warning and fall back to the general active pool.

#### [MODIFY] [AssignmentService.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/AssignmentService.ts)
- Set default strategy to `CapacityWeightedAssignmentStrategy`.
- Pass `priority` parameter into `strategy.assign(category, requestedSpecialty, priority)`.

#### [MODIFY] [TicketService.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/TicketService.ts)
- Implement `enforceEscalation(ticketId: string)` with dynamic priority escalation thresholds:
  - CRITICAL (P1): 10 minutes
  - HIGH (P2): 20 minutes
  - MEDIUM (P3): 45 minutes
  - LOW (P4): 120 minutes
- Reassign ticket to Tier 2 specialist via `assignmentService` when threshold is exceeded.
- Implement `processPendingEscalations(tenantId?: string)`.

#### [NEW] [AlertService.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/AlertService.ts)
- Create `AlertService` with `processRMMAlert(input)`:
  - Deduplicate alerts occurring within a 15-minute window for the same asset.
  - Evaluate rolling 24-hour alert frequency per `(alertType, assetId)`.
  - If frequency $\ge 3$ (Flapping Alert):
    - Bypass auto-close even if self-healing duration $t < 300\text{s}$.
    - Set status to `OPEN`, category to `PREVENTATIVE_MAINTENANCE`, tag title/description with `[FLAPPING_ALERT]`.
    - Assign directly to Tier 2 technician.
  - If frequency $< 3$ and execution time $t < 300\text{s}$:
    - Auto-close with status `RESOLVED_AUTOMATED`.
  - Provide KPI calculator methods:
    - `calculateNoiseReductionRatio(totalAlerts, humanTouchTickets)`
    - `calculateSelfHealingEfficiency(autoClosedCount, flappingOverridesCount)`
    - `calculateFirstContactResolutionAutomation(automatedResolvedCount, totalTicketsIngested)`

---

### Tests & Documentation

#### [NEW] [AlertService.test.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/AlertService.test.ts)
- Test 15-minute deduplication window per asset.
- Test 24-hour rolling count for flapping alerts ($\ge 3$ triggers).
- Test flapping override (bypassing auto-close, setting `PREVENTATIVE_MAINTENANCE`, `FLAPPING_ALERT` tag, and Tier 2 routing).
- Test self-healing auto-close ($t < 300\text{s}$ and count $< 3$).
- Test KPI metric calculations ($NRR$, $SHE$, $FCR_A$).

#### [MODIFY] [AssignmentService.test.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/AssignmentService.test.ts)
- Test `CapacityWeightedAssignmentStrategy` load factor minimization.
- Test priority weight calculations (P1=4.0, P2=2.0, P3=1.0, P4=0.5).
- Test fallback to general pool when all specialists exceed $L_k > 15.0$.

#### [MODIFY] [TicketService.test.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/services/TicketService.test.ts)
- Test dynamic priority-weighted SLA escalations (10m for CRITICAL, 20m for HIGH, 45m for MEDIUM, 120m for LOW).

#### [MODIFY] [AGENTS.md](file:///c:/Users/Public/Workspace/msp_client_portal/AGENTS.md)
- Update Master Business Logic Specification Section to reflect Pillar 1 rules (Rule 1.1, Rule 1.2, Rule 1.3) and KPI definitions.

---

## Verification Plan

### Automated Tests
- Run `npx vitest run` in `server/` to verify all 186+ unit tests pass cleanly, including all new AlertService, AssignmentService, and TicketService tests.

### Manual Verification
- Verify dynamic threshold evaluation and load factor calculations against test fixtures.
