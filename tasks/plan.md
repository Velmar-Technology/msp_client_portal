# Implementation Plan: Financial Migration to `<Page />` View Modes Architecture

## Overview
Migrate `FinancialPage.tsx` from ad-hoc URL tab parameters and mixed layouts to the enterprise `<Page>` view architecture (`Page.ViewSwitcher`, `Page.View`, `Page.Toolbar`). Elevate financial operations into four unified first-class view modes: **Overview & Charts** (`dashboard`), **Transactions Ledger** (`ledger`), **Technician Commissions** (`payroll`), and **Financial Analytics** (`graph`), while preserving 100% backwards compatibility with legacy `?tab=` query parameters.

## Architecture Decisions
1. **First-Class View Modes via `<Page availableViews={[...]}>`**:
   - `dashboard`: Executive Overview with KPI cards, Revenue Chart, Expense Doughnut, and recent ledger movements.
   - `ledger`: Dedicated full-width Transactions Ledger (`TransactionsTable`) with date filtering and CSV export.
   - `payroll`: Dedicated Technician Payroll and labor bounty accounting (`TechnicianPayrollTable`).
   - `graph`: Native SVG Expense Category allocation and Net Profit split visualization powered by `<Page.Graph>`.
2. **Standardized View Switching & Toolbar Placement**:
   - Relocate `<Page.ViewSwitcher>` inside `<Page.Controls>` within `<Page.Toolbar>`.
   - All buttons, date selectors, and view switchers adhere to compact `h-7` (28px).
3. **Dual Parameter Synchronization (URL Normalization & Backwards Compatibility)**:
   - Canonical view state uses `?view=`.
   - If legacy `?tab=payroll` is present, it transparently maps to `payroll` view mode.
   - Updates to `view` synchronize both `view` and legacy `tab` to prevent breaking existing bookmarks or test suites.
4. **i18n Localization**:
   - Replace hardcoded view labels with i18n keys (`financial.views.dashboard`, `financial.views.ledger`, `financial.views.payroll`, `financial.views.graph`, and analytics chart subtitles) in `en_US.json` and `es_DO.json`.

## Task List

### Phase 1: Foundations & Translations
- [ ] Task 1: Add Financial View Mode i18n Localization Keys in `en_US.json` and `es_DO.json`

### Checkpoint: Foundations
- [ ] Locale files compile cleanly with valid JSON syntax

### Phase 2: Financial View Modes Migration
- [ ] Task 2: Refactor `FinancialPage.tsx` root container, `availableViews`, and URL normalization
- [ ] Task 3: Implement Dedicated Transactions Ledger View (`<Page.View type="ledger">`)
- [ ] Task 4: Implement Financial Analytics View (`<Page.View type="graph">` via `<Page.Graph>`)

### Checkpoint: View Modes Migration Green
- [ ] All four views (`dashboard`, `ledger`, `payroll`, `graph`) switch smoothly without page reload
- [ ] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 3: Verification & Regression Testing
- [ ] Task 5: Expand `FinancialPage.test.tsx` for All View Modes and Legacy Fallback

### Checkpoint: Complete Verification
- [ ] Targeted tests pass: `npm -w client run test:run -- src/features/financial/pages/FinancialPage.test.tsx`
- [ ] Full client test suite passes: `npm -w client run test:run`
- [ ] Client compiles cleanly: `npm -w client run build`

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Existing tests or bookmarks relying on `?tab=payroll` break | High | Read both `?view` and `?tab`, prioritizing `?view` while aliasing `?tab=payroll` to `payroll` mode. |
| Heavy charts causing unnecessary re-renders in ledger or payroll views | Low | `RevenueChart` and `ExpenseDoughnut` remain code-split behind `lazyWithRetry` and only render in `dashboard` mode. |
| Empty expense categories in `Page.Graph` | Medium | Guard data mapping with default zero values and fallback empty states. |

## Open Questions
- None. Requirements follow the established `<Page>` view architecture recipe.
