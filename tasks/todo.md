# Tasks: Unified L2 Metric Card Primitive (`<MetricCard />`)

## Task 1: Create `client/src/components/shared/MetricCard.tsx`
**Description:** Implement the canonical L2 shared primitive `<MetricCard />` using Radix UI `Card` (`@/components/ui/card`), supporting hybrid flat props (`title`, `value`, `trend`, `icon`, `badge`, `subtitle`, `footer`, `isLoading`, `onClick`) and compound slots (`MetricCard.Header`, `MetricCard.Title`, `MetricCard.Icon`, `MetricCard.Badge`, `MetricCard.Value`, `MetricCard.Trend`, `MetricCard.Subtitle`, `MetricCard.Footer`).

**Acceptance criteria:**
- [x] Conforms to unified density: `p-3.5`, `min-h-[120px]`, `border-border`, subtle hover elevation.
- [x] Supports both direct flat props and compound subcomponent composition.
- [x] Trend pill supports `direction: "up" | "down" | "neutral"`, `isPositive: boolean`, and string/number/ReactNode values.
- [x] Built-in skeleton state (`isLoading`) matching the exact card dimensions and inner hierarchy.
- [x] Keyboard accessibility (`role="button"`, `tabIndex={0}`, Enter/Space key triggers) when `onClick` is provided.
- [x] Full JSDoc/TSDoc documentation with `@param`, `@returns`, and `@see`.

**Verification:**
- [x] File exists at `client/src/components/shared/MetricCard.tsx`
- [x] Types compile cleanly without errors

**Dependencies:** None
**Files likely touched:**
- `client/src/components/shared/MetricCard.tsx`
**Estimated scope:** Small (1 file)

---

## Task 2: Create unit tests in `MetricCard.test.tsx` and export from `index.ts`
**Description:** Author unit tests covering all rendering modes: flat props, compound slots, trend badge states, loading skeleton, click handlers, and keyboard events. Export `MetricCard` and `type MetricCardProps` from `client/src/components/shared/index.ts`.

**Acceptance criteria:**
- [x] Unit tests test flat prop rendering (title, value, subtitle, footer, icon, badge).
- [x] Unit tests test compound subcomponents rendering.
- [x] Unit tests test positive, negative, and neutral trend badge variants.
- [x] Unit tests test `isLoading` skeleton rendering and `aria-busy`.
- [x] Unit tests test click and keyboard trigger (`Enter`, `Space`) when `onClick` is provided.
- [x] Re-exported from `client/src/components/shared/index.ts`.

**Verification:**
- [x] Focused tests pass: `npm -w client run test:run client/src/components/shared/MetricCard.test.tsx`

**Dependencies:** Task 1
**Files likely touched:**
- `client/src/components/shared/MetricCard.test.tsx`
- `client/src/components/shared/index.ts`
**Estimated scope:** Small (2 files)

---

### Checkpoint: Foundation
- [x] `MetricCard` unit tests pass cleanly
- [x] Export verified from `@/components/shared`

---

## Task 3: Migrate `StatCard` call-sites and remove `StatCard.tsx`
**Description:** Refactor all usages of `StatCard` across `UserStatsBar.tsx`, `CRMPage.tsx`, and `StyleGuidePage.tsx` to `<MetricCard />`. Update `StyleGuidePage.test.tsx` and delete `client/src/components/shared/StatCard.tsx`.

**Acceptance criteria:**
- [x] `client/src/features/users/components/UserStatsBar.tsx` uses `MetricCard`.
- [x] `client/src/features/crm/pages/CRMPage.tsx` uses `MetricCard`.
- [x] `client/src/components/shared/StyleGuidePage.tsx` and its test use `MetricCard`.
- [x] `client/src/components/shared/StatCard.tsx` is deleted.
- [x] `client/src/components/shared/index.ts` no longer exports `StatCard`.

**Verification:**
- [x] `npm -w client run test:run client/src/components/shared/StyleGuidePage.test.tsx` passes
- [x] No remaining references to `StatCard` in `client/src`

**Dependencies:** Task 2
**Files likely touched:**
- `client/src/features/users/components/UserStatsBar.tsx`
- `client/src/features/crm/pages/CRMPage.tsx`
- `client/src/components/shared/StyleGuidePage.tsx`
- `client/src/components/shared/StyleGuidePage.test.tsx`
- `client/src/components/shared/StatCard.tsx` (DELETE)
- `client/src/components/shared/index.ts`
**Estimated scope:** Medium (6 files)

---

### Checkpoint: StatCard Migration
- [x] StyleGuide and UserStatsBar compile and pass tests

---

## Task 4: Migrate `SummaryCard` call-sites to `MetricCard`
**Description:** Refactor all usages of `SummaryCard` across `ApiStatusPage.tsx`, `TechDashboardPage.tsx`, `DashboardSummaryStats.tsx`, `StorageQuota.tsx`, `AdminDashboardView.tsx`, and `RmmKpiGrid.tsx` to `<MetricCard />`.

**Acceptance criteria:**
- [x] `ApiStatusPage.tsx` uses `MetricCard` for all endpoint telemetry and incident metric cards.
- [x] `TechDashboardPage.tsx` uses `MetricCard` for assigned ticket metrics.
- [x] `DashboardSummaryStats.tsx` uses `MetricCard` for top-level MSP KPIs.
- [x] `StorageQuota.tsx` uses compound `<MetricCard>` with custom progress bar.
- [x] `AdminDashboardView.tsx` uses `MetricCard` with `isLoading` support.
- [x] `RmmKpiGrid.tsx` uses `MetricCard` for device health telemetry.

**Verification:**
- [x] Type check passes on modified files: `npm -w client run build`

**Dependencies:** Task 3
**Files likely touched:**
- `client/src/features/system/pages/ApiStatusPage.tsx`
- `client/src/features/dashboard/pages/TechDashboardPage.tsx`
- `client/src/features/dashboard/components/DashboardSummaryStats.tsx`
- `client/src/features/dashboard/components/StorageQuota.tsx`
- `client/src/features/dashboard/components/AdminDashboardView.tsx`
- `client/src/components/devices/RmmKpiGrid.tsx`
**Estimated scope:** Medium (6 files)

---

## Task 5: Remove `SummaryCard.tsx`, test file, and dashboard re-export
**Description:** Delete `SummaryCard.tsx`, `SummaryCard.test.tsx`, and `client/src/components/dashboard/summary-card.tsx`. Update `client/src/components/shared/index.ts` to remove `SummaryCard` export.

**Acceptance criteria:**
- [x] `client/src/components/shared/SummaryCard.tsx` deleted.
- [x] `client/src/components/shared/SummaryCard.test.tsx` deleted.
- [x] `client/src/components/dashboard/summary-card.tsx` deleted.
- [x] Zero references to `SummaryCard` remain in `client/src`.

**Verification:**
- [x] Ripgrep for `SummaryCard` yields 0 results in `client/src`

**Dependencies:** Task 4
**Files likely touched:**
- `client/src/components/shared/SummaryCard.tsx` (DELETE)
- `client/src/components/shared/SummaryCard.test.tsx` (DELETE)
- `client/src/components/dashboard/summary-card.tsx` (DELETE)
- `client/src/components/shared/index.ts`
**Estimated scope:** Small (4 files)

---

### Checkpoint: SummaryCard Migration
- [x] No remaining `SummaryCard` references in the entire workspace

---

## Task 6: Refactor `PageDashboardKpi` and `KpiCards.tsx` to `MetricCard`
**Description:** Update `client/src/components/page/PageDashboard.tsx` so that `PageDashboardKpi` delegates to or wraps `<MetricCard />` with unified styling. Update `client/src/features/financial/components/KpiCards.tsx` to use `MetricCard` directly or via `Page.DashboardKpi`. Update test files `client/src/components/Page.test.tsx` and `client/src/features/financial/pages/FinancialPage.test.tsx`.

**Acceptance criteria:**
- [x] `PageDashboardKpi` renders with unified `MetricCard` tokens.
- [x] `KpiCards.tsx` renders four financial KPIs cleanly without layout distortion.
- [x] `Page.test.tsx` and `FinancialPage.test.tsx` assertions pass.

**Verification:**
- [x] `npm -w client run test:run client/src/components/Page.test.tsx` passes
- [x] `npm -w client run test:run client/src/features/financial/pages/FinancialPage.test.tsx` passes

**Dependencies:** Task 5
**Files likely touched:**
- `client/src/components/page/PageDashboard.tsx`
- `client/src/features/financial/components/KpiCards.tsx`
- `client/src/components/Page.test.tsx`
- `client/src/features/financial/pages/FinancialPage.test.tsx`
**Estimated scope:** Medium (4 files)

---

### Checkpoint: Financials & Page Component
- [x] Financial and Page test suites pass green

---

## Task 7: Global Verification & DoD Audit
**Description:** Run comprehensive TypeScript build, full Vitest test suite, and linter to verify zero regressions across the monorepo.

**Acceptance criteria:**
- [x] `npm -w client run build` succeeds with zero errors.
- [x] `npm -w client run test:run` passes with zero failing tests.
- [x] Zero TypeScript errors and complete Clean Architecture boundary compliance.
- [x] JSDoc and Clean Architecture standards verified.

**Verification:**
- [x] Terminal logs confirm green compilation and test passes

**Dependencies:** Task 6
**Files likely touched:**
- None (verification only)
**Estimated scope:** XS (0 files)

---

### Checkpoint: Complete Verification
- [x] All 7 tasks completed and verified
- [x] Clean Git status
- [x] DoD satisfied
