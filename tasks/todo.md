# Tasks: Financial Migration to `<Page />` View Modes Architecture

## Task 1: Add Financial View Mode i18n Localization Keys
**Description:** Add localization strings for financial view modes (`financial.views.dashboard`, `financial.views.ledger`, `financial.views.payroll`, `financial.views.graph`) and visual analytics titles in `client/src/locales/en_US.json` and `client/src/locales/es_DO.json`.

**Acceptance criteria:**
- [ ] Added translations for all 4 view mode labels in `en_US.json`
- [ ] Added translations for all 4 view mode labels in `es_DO.json`
- [ ] Added translations for analytics chart titles and subtitles
- [ ] Both JSON files parse without syntax errors

**Verification:**
- [ ] Build succeeds: `npm -w client run build`

**Dependencies:** None
**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`

**Estimated scope:** XS (2 files)

---

### Checkpoint: Foundations
- [ ] Locale files compile cleanly with valid JSON syntax

---

## Task 2: Refactor FinancialPage.tsx Root Container & URL Normalization
**Description:** Refactor `FinancialPage.tsx` root container to pass `activeView`, `onViewChange`, `defaultView="dashboard"`, and `availableViews` to `<Page>`. Position `<Page.ViewSwitcher>` inside `<Page.Controls>` within `<Page.Toolbar>`. Map legacy `?tab=payroll` to `payroll` and `?tab=overview` to `dashboard`, while maintaining dual sync for legacy compatibility.

**Acceptance criteria:**
- [ ] `<Page>` is configured with `availableViews` covering `dashboard`, `ledger`, `payroll`, and `graph`
- [ ] `<Page.ViewSwitcher>` is placed in `<Page.Controls>` inside `<Page.Toolbar>`
- [ ] Legacy `?tab=payroll` activates the `payroll` view
- [ ] Default view is `dashboard`
- [ ] Existing callers and URL bookmarks remain fully functional

**Verification:**
- [ ] Build succeeds: `npm -w client run build`
- [ ] Tests pass: `npm -w client run test:run -- src/features/financial/pages/FinancialPage.test.tsx`

**Dependencies:** Task 1
**Files likely touched:**
- `client/src/features/financial/pages/FinancialPage.tsx`

**Estimated scope:** S (1 file)

---

## Task 3: Implement Dedicated Transactions Ledger View via Page.View type="ledger"
**Description:** Add `<Page.View type="ledger">` in `FinancialPage.tsx` rendering `TransactionsTable` as a dedicated full-width view, allowing focused ledger auditing with date range filters and export actions.

**Acceptance criteria:**
- [ ] `<Page.View type="ledger">` contains `<TransactionsTable>`
- [ ] Date selector and Export button remain functional in `ledger` view mode
- [ ] Full transactions dataset is visible without chart scrolling

**Verification:**
- [ ] Build succeeds: `npm -w client run build`
- [ ] Tests pass: `npm -w client run test:run -- src/features/financial/pages/FinancialPage.test.tsx`

**Dependencies:** Task 2
**Files likely touched:**
- `client/src/features/financial/pages/FinancialPage.tsx`

**Estimated scope:** S (1 file)

---

## Task 4: Implement Financial Analytics View via Page.View type="graph"
**Description:** Add `<Page.View type="graph">` in `FinancialPage.tsx` rendering `<Page.Graph>`. Map `expenseCategories` into `PageGraphDataPoint[]` displaying expense allocation by category, alongside a monthly revenue vs expenses comparison chart.

**Acceptance criteria:**
- [ ] `<Page.View type="graph">` contains `<Page.Graph>` components
- [ ] Maps `expenseCategories` to interactive SVG charts (Donut & Bar)
- [ ] Maps `monthlyData` to monthly financial comparison trend charts
- [ ] Supports interactive chart type switching via `Page.Graph`

**Verification:**
- [ ] Build succeeds: `npm -w client run build`
- [ ] Tests pass: `npm -w client run test:run -- src/features/financial/pages/FinancialPage.test.tsx`

**Dependencies:** Task 3
**Files likely touched:**
- `client/src/features/financial/pages/FinancialPage.tsx`

**Estimated scope:** S (1 file)

---

### Checkpoint: View Modes Migration Green
- [ ] All four views (`dashboard`, `ledger`, `payroll`, `graph`) switch smoothly without page reload
- [ ] Client builds clean with zero type errors (`npm -w client run build`)

---

## Task 5: Expand FinancialPage.test.tsx for All View Modes and Legacy Fallback
**Description:** Update `FinancialPage.test.tsx` with dedicated unit tests validating that all four views render when selected, that the view switcher operates properly, and that legacy `?tab=payroll` correctly defaults to the payroll view.

**Acceptance criteria:**
- [ ] Test verifies that default view is `dashboard` and renders overview charts and recent transactions
- [ ] Test verifies switching to `ledger` renders dedicated transactions table
- [ ] Test verifies switching to `payroll` renders technician commissions table
- [ ] Test verifies switching to `graph` renders financial analytics charts
- [ ] Test verifies that providing `?tab=payroll` directly renders the payroll view

**Verification:**
- [ ] Tests pass: `npm -w client run test:run -- src/features/financial/pages/FinancialPage.test.tsx`
- [ ] Full client test suite passes: `npm -w client run test:run`
- [ ] Build succeeds: `npm -w client run build`

**Dependencies:** Task 4
**Files likely touched:**
- `client/src/features/financial/pages/FinancialPage.test.tsx`

**Estimated scope:** M (1 file)

---

### Checkpoint: Complete Verification
- [ ] Full client test suite passes: `npm -w client run test:run` (all test suites green)
- [ ] Zero TypeScript compile errors: `npm -w client run build`
- [ ] Definition of Done satisfied per `AGENTS.md`
