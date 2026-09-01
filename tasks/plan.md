# Implementation Plan: Custom Plan Cost Calculation Engine

## Overview
Implement a comprehensive, parametric cost calculation engine for custom MSP plans in `CRMCustomPlanPage` driven by `featureCatalog.ts`. This engine dynamically calculates base monthly costs, per-device add-on costs, SLA premium multipliers, and estimated MSP margin while maintaining sales-rep override capability and real-time visual breakdown.

## Architecture Decisions
- **Single Source of Truth for Pricing Rules (`client/src/constants/featureCatalog.ts` & `planCostCalculator.ts`):** Extend `FeatureCatalogItem` with structured pricing models (e.g. flat add-on, per-device rate, tiered parameter pricing, formula multipliers).
- **Pure Calculation Engine (`client/src/utils/planCostCalculator.ts`):** Isolate all financial math in a pure, zero-side-effect TypeScript module with 100% unit test coverage using Vitest.
- **Bi-directional Price Sync in UI (`CRMCustomPlanPage.tsx`):**
  - **Auto-Calculate Mode (Default):** Base rate and per-device rate update dynamically as features and parameters are toggled/tuned.
  - **Manual Override Mode:** If a sales rep edits the price directly, show a "Suggested from Features" badge with a one-click "Reset / Sync with Features" button.
- **Granular Line-Item Cost Breakdown in Sidebar:** Expand the live projection card with an accordion/itemized list showing each active feature's contribution to Base Rate ($) and Per-Device Rate ($/pc).
- **SLA & Quota Dynamics:** Fast SLA targets (e.g. 15m P1) and high/unlimited ticket quotas apply clear mathematical adjustments to the calculated baseline.

## Dependency Graph
```
featureCatalog.ts (Pricing Schema & Rules)
    │
    ▼
planCostCalculator.ts (Pure Cost Engine) ───► planCostCalculator.test.ts (Vitest Unit Tests)
    │
    ▼
CRMCustomPlanPage.tsx (UI Integration & Live Line-Item Breakdown)
    │
    ▼
locales (en_US.json & es_DO.json)
```

## Task List

### Phase 1: Foundation & Pricing Logic
- [ ] **Task 1: Define Feature Pricing Rules & Schema in `featureCatalog.ts`**
- [ ] **Task 2: Implement Pure `planCostCalculator` Engine & Unit Tests**

### Checkpoint 1: Engine Verification
- [ ] Vitest unit tests pass for all feature pricing permutations and edge cases
- [ ] Typecheck succeeds (`npm -w client run build`)

### Phase 2: UI Integration & Live Breakdown
- [ ] **Task 3: Integrate Cost Calculator into `CRMCustomPlanPage` with Auto-Sync & Manual Override**
- [ ] **Task 4: Add Line-Item Cost Breakdown & Margin/Pricing Indicators to Sidebar**

### Checkpoint 2: UI & Feature Integration Verification
- [ ] Toggling catalog features and changing parameters immediately reflects in cost calculations
- [ ] Cloning standard plans pre-fills features and matches template costs
- [ ] Manual price edits trigger override status with one-click recalculation
- [ ] Frontend build succeeds without warnings

### Phase 3: Localization & Polish
- [ ] **Task 5: Add i18n Localization Keys for Pricing Details & Currency Support**

### Checkpoint 3: Complete Definition of Done
- [ ] English and Spanish translations complete
- [ ] Clean compilation with zero TypeScript errors
- [ ] Full Vitest test suite green

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Backward compatibility with legacy custom plans lacking pricing metadata | Low | Pure calculator defaults un-priced custom features to $0 add-on and falls back gracefully. |
| Sales reps feeling restricted by automatic calculations | Med | Provide non-intrusive manual price overrides with visual indicator of the calculated baseline. |
| Complex parameter schema variations (numbers vs strings) | Low | Standardized parameter parser in `planCostCalculator` handles both numeric and string values safely. |

## Open Questions
- None blocking; ready for execution upon confirmation.
