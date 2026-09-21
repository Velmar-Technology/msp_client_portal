# Implementation Plan: Unified L2 Metric Card Primitive (`<MetricCard />`)

## Overview
Unify `StatCard`, `SummaryCard`, and `PageDashboardKpi` into a single canonical Level 2 primitive (`<MetricCard />`) located at `client/src/components/shared/MetricCard.tsx`. The primitive provides a hybrid API (direct flat props for standard metrics + optional compound subcomponents for custom slots), single unified density (`min-h-[120px]`, `p-3.5`, `text-xl` font), built-in skeleton states, keyboard accessibility, and standard semantic trend pills. All existing call-sites across the entire codebase will be directly refactored to eliminate duplicate card components.

## Architecture Decisions
- **L1/L2 Layering Compliance**: Built on top of Radix UI L1 primitive `Card` (`@/components/ui/card`) with zero ad-hoc raw container styles.
- **Hybrid Ergonomics**: Flat props (`title`, `value`, `trend`, `icon`, `badge`, `subtitle`, `footer`, `isLoading`, `onClick`) cover 95% of use-cases with minimal JSX; compound subcomponents (`MetricCard.Header`, `MetricCard.Value`, etc.) allow embedding custom controls (e.g. progress bars).
- **Single Unified Density**: Consistent compact height (`min-h-[120px]`), padding (`p-3.5`), title typography (`text-[11px] font-medium uppercase tracking-wider text-muted-foreground`), and metric value typography (`text-xl font-bold tracking-tight text-foreground font-heading`).
- **Zero Legacy Aliases**: Complete migration of all ~35 call-sites and deletion of `StatCard.tsx`, `SummaryCard.tsx`, and `components/dashboard/summary-card.tsx`.

## Task List

### Phase 1: L2 Primitive Foundation & Test Suite
- [ ] Task 1: Create `MetricCard.tsx` in `client/src/components/shared/` with hybrid props and compound slots
- [ ] Task 2: Create unit tests in `client/src/components/shared/MetricCard.test.tsx` and export from `components/shared/index.ts`

### Checkpoint: Foundation
- [ ] MetricCard unit test suite passes: `npm -w client run test:run client/src/components/shared/MetricCard.test.tsx`

### Phase 2: Direct Refactor of `StatCard` Call-Sites
- [ ] Task 3: Migrate `UserStatsBar.tsx`, `CRMPage.tsx`, and `StyleGuidePage.tsx` to `MetricCard`, and remove `StatCard.tsx`

### Checkpoint: StatCard Migration
- [ ] StyleGuide and CRM tests pass

### Phase 3: Direct Refactor of `SummaryCard` Call-Sites
- [ ] Task 4: Migrate `ApiStatusPage.tsx`, `TechDashboardPage.tsx`, `DashboardSummaryStats.tsx`, `StorageQuota.tsx`, `AdminDashboardView.tsx`, and `RmmKpiGrid.tsx` to `MetricCard`
- [ ] Task 5: Remove `SummaryCard.tsx`, `SummaryCard.test.tsx`, and `components/dashboard/summary-card.tsx`

### Checkpoint: SummaryCard Migration
- [ ] Dashboard and System tests pass

### Phase 4: Direct Refactor of `PageDashboardKpi` & Financials
- [ ] Task 6: Refactor `PageDashboard.tsx` (`PageDashboardKpi`) and `KpiCards.tsx` to use `MetricCard`, updating test assertions

### Checkpoint: Financials & Page Component
- [ ] `FinancialPage.test.tsx` and `Page.test.tsx` pass

### Phase 5: Global Verification & DoD Audit
- [ ] Task 7: Full client test suite and production build verification (`npm -w client run build`, `npm -w client run test:run`)

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Zero TypeScript errors, zero test regressions, clean Git tree

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| `FinancialPage` visual downgrade with `text-xl` vs `text-2xl sm:text-3xl` | Low | Unified `text-xl font-bold tracking-tight font-heading` balances perfectly with standard 4-column KPI grids. |
| Custom children in `StorageQuota` breaking | Medium | Compound layout `<MetricCard>` with subcomponents explicitly supports custom children and progress bars. |
| Breaking unknown external imports of `SummaryCard` or `StatCard` | Low | Ripgrep confirms all references are strictly internal to `client/src`. All call sites are refactored in this plan. |

## Open Questions
- None. Design requirements, density, and API style were resolved during `/idea-refine`.
