# Task List: Custom Plan Cost Calculation

## Task 1: Define Feature Pricing Rules & Schema in `featureCatalog.ts`
**Description:** Enrich `FeatureCatalogItem` in `client/src/constants/featureCatalog.ts` with pricing metadata (`pricingRule`), supporting flat base prices, per-device prices, parameter-based add-ons (e.g. GB storage costs, EDR tiers, SOC coverage, SLA tiers, M365 backup scopes).

**Acceptance criteria:**
- [x] `FeatureCatalogItem` interface extended with `pricingRule?: FeaturePricingRule`
- [x] Standard catalog features (Helpdesk, EDR, Cloud Storage, Backups, M365, Compliance, SOC, etc.) annotated with pricing baselines and parameter option cost adjustments.
- [x] Custom features with user-defined text gracefully default to $0 or configurable manual rates.

**Verification:**
- [x] TypeScript check succeeds: `npm -w client run build`
- [x] No regression in existing usage in `PlanEditorPage` or `usePlansPage`

**Dependencies:** None
**Files likely touched:**
- `client/src/constants/featureCatalog.ts`
**Estimated scope:** Small (1 file)

---

## Task 2: Implement Pure `planCostCalculator` Engine & Unit Tests
**Description:** Create a pure financial calculation engine `client/src/utils/planCostCalculator.ts` that calculates base monthly cost, per-device rate, SLA premium adjustment, quota multiplier, and detailed line-item breakdowns from plan features and lead parameters. Co-locate comprehensive Vitest unit tests.

**Acceptance criteria:**
- [x] `calculatePlanCosts(input: PlanCostInput): PlanCostResult` handles all feature codes, parameter values, equipment counts, billing cycles, and SLA tiers.
- [x] Returns detailed `lineItems` with `{ code, labelKey, baseCost, perDeviceCost, totalMonthly }`.
- [x] 100% test coverage on `client/src/utils/planCostCalculator.test.ts` testing edge cases (0 devices, annual discount, custom params, invalid inputs).

**Verification:**
- [x] Tests pass: `npm -w client run test:run client/src/utils/planCostCalculator.test.ts`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 1
**Files likely touched:**
- `client/src/utils/planCostCalculator.ts`
- `client/src/utils/planCostCalculator.test.ts`
**Estimated scope:** Small-Medium (2 files)

---

## Checkpoint: Foundation & Calculator Verification
- [x] All unit tests pass in `client/src/utils/planCostCalculator.test.ts`
- [x] Typecheck passes without errors (`npm -w client run build`)

---

## Task 3: Integrate Cost Calculator into `CRMCustomPlanPage` with Auto-Sync & Manual Override
**Description:** Update `CRMCustomPlanPage.tsx` to utilize `calculatePlanCosts`. Automatically compute suggested base price and per-device rate when features are toggled, added, or parameters modified, while allowing sales reps to toggle between "Auto-calculated" and "Custom Overridden" pricing.

**Acceptance criteria:**
- [x] Changing features or parameters dynamically recalculates suggested base & per-device prices.
- [x] "Auto-calculated" / "Suggested: $X.XX" badge displayed next to price inputs with a "Sync / Apply Suggested" button.
- [x] Manual adjustments preserve user's price while showing the variance from calculated catalog cost.
- [x] Cloning from standard plan updates features and aligns prices accordingly.

**Verification:**
- [x] Manual check: Adding/removing features in the Studio updates prices and real-time summary instantly.
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 1, Task 2
**Files likely touched:**
- `client/src/pages/CRMCustomPlanPage/CRMCustomPlanPage.tsx`
**Estimated scope:** Medium (1 file)

---

## Task 4: Add Line-Item Cost Breakdown & Financial Summary in Sidebar
**Description:** Enhance the Live Contract & Revenue Projection sidebar in `CRMCustomPlanPage.tsx` to show an expandable line-item cost breakdown of all active features (Base vs Per-Device contribution), annual contract discount, and ITBIS tax.

**Acceptance criteria:**
- [x] Sidebar displays an itemized list of features contributing to the plan total.
- [x] Subtotals for "Base Service Capabilities" vs "Device Protection & Agent Licenses" clearly visible.
- [x] Annual 10% discount and 18% DGII ITBIS dynamically recalculate.

**Verification:**
- [x] Visual verification of sidebar breakdown in browser.
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 3
**Files likely touched:**
- `client/src/pages/CRMCustomPlanPage/CRMCustomPlanPage.tsx`
**Estimated scope:** Small (1 file)

---

## Task 5: Add i18n Localization Keys for Pricing Details & Currency Support
**Description:** Add all new localization strings in `client/src/locales/en_US.json` and `client/src/locales/es_DO.json` for auto-calculation badges, sync buttons, line-item headers, and pricing breakdown tooltips.

**Acceptance criteria:**
- [x] Zero hardcoded UI strings.
- [x] Complete translation parity between `en_US.json` and `es_DO.json`.

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Frontend tests pass: `npm -w client run test:run`

**Dependencies:** Task 3, Task 4
**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`
**Estimated scope:** Small (2 files)

---

## Checkpoint: Final Verification & DoD
- [x] All client tests pass: `npm -w client run test:run`
- [x] Client builds clean with zero errors: `npm -w client run build`
- [x] Feature catalog cost calculation is interactive, robust, and verified.

