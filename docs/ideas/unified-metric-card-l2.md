# Unified L2 Metric Card Primitive (`<MetricCard />`)

## Problem Statement
How might we eliminate the fragmentation between `StatCard`, `SummaryCard`, and `PageDashboardKpi` by introducing a single Level 2 shared primitive (`<MetricCard />`) that unifies visual density, typography, trend indicators, and skeleton states across all 35+ metric cards in the MSP Client Portal?

## Recommended Direction
Build `MetricCard` in `client/src/components/shared/MetricCard.tsx` as the canonical L2 shared primitive built directly on the Radix-backed L1 primitive (`Card` from `@/components/ui/card`):

1. **Hybrid Architecture**:
   - **Direct Prop Usage (Standard 95% use-case):**
     ```tsx
     <MetricCard
       title={t("dashboard.openTickets")}
       value={42}
       icon={<Ticket className="size-4" />}
       trend={{ value: "+12%", direction: "up", isPositive: true }}
       subtitle={t("dashboard.vsLastMonth")}
       isLoading={isLoading}
       onClick={handleDrilldown}
     />
     ```
   - **Compound Slot Composition (Custom layouts like StorageQuota):**
     ```tsx
     <MetricCard>
       <MetricCard.Header>
         <MetricCard.Title>{title}</MetricCard.Title>
         <MetricCard.Icon>{icon}</MetricCard.Icon>
       </MetricCard.Header>
       <MetricCard.Value>{value}</MetricCard.Value>
       <Progress value={pct} className="h-1.5 mt-2" />
       <MetricCard.Footer>{used} / {total}</MetricCard.Footer>
     </MetricCard>
     ```

2. **Unified Design System Standard**:
   - **Container:** `p-3.5`, `min-h-[120px]`, `border-border`, subtle hover elevation `hover:border-primary/40 hover:shadow-xs`.
   - **Header:** `text-[11px] font-medium text-muted-foreground uppercase tracking-wider`.
   - **Value:** `text-xl font-bold tracking-tight text-foreground font-heading`.
   - **Trend Pill:** Standardized semantic tokens:
     - Positive: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`
     - Negative: `bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20`
     - Neutral: `bg-muted text-muted-foreground border border-border/60`
   - **Loading State:** Built-in semantic skeleton layout (`isLoading`) matching the exact layout tokens to prevent layout shifts.
   - **Accessibility:** Built-in `role="button"`, `tabIndex={0}`, and Enter/Space keyboard triggers when `onClick` is provided.

## Key Assumptions to Validate
- [ ] Replacing `PageDashboardKpi` in `FinancialPage` (`text-2xl sm:text-3xl`) with unified `text-xl` preserves executive readability.
- [ ] Replacing `StatCard` in `UserStatsBar` and `CRMPage` preserves flex and grid alignment.
- [ ] Direct refactoring of all ~35 call-sites passes all Vitest component test suites (`npm -w client run test:run`).

## MVP Scope
- Create `client/src/components/shared/MetricCard.tsx` and unit tests in `client/src/components/shared/MetricCard.test.tsx`.
- Export `MetricCard`, `type MetricCardProps`, and subcomponents from `client/src/components/shared/index.ts`.
- Refactor all call-sites across:
  - `UserStatsBar.tsx` & `CRMPage.tsx` (formerly `StatCard`)
  - `TechDashboardPage.tsx`, `AdminDashboardView.tsx`, `DashboardSummaryStats.tsx`, `StorageQuota.tsx`, `ApiStatusPage.tsx`, `RmmKpiGrid.tsx` (formerly `SummaryCard`)
  - `KpiCards.tsx` / `FinancialPage.tsx` & `PageDashboard.tsx` (formerly `PageDashboardKpi`)
- Remove deprecated duplicate files: `StatCard.tsx`, `SummaryCard.tsx`, and `components/dashboard/summary-card.tsx`.

## Not Doing (and Why)
- **Multi-size density variants (`sm`, `lg`, `hero`):** Explicitly omitted per decision to maintain single uniform visual density.
- **Embedded Sparkline charts:** Deferred to feature-specific composition via compound children to keep the L2 primitive lightweight and fast.
- **Legacy Adapter Shims:** Bypassed in favor of a clean, full codebase migration leaving zero dead or aliased code.
