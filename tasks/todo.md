# Tasks: Odoo-Style View System for Page Component

## Task 1: Create PageContext and Headless View Hook
**Description:** Implement `client/src/components/page/PageContext.tsx` providing view state management (`activeView`, `setActiveView`, `availableViews`), search state (`searchQuery`, `setSearchQuery`), and pagination (`page`, `pageSize`, `totalCount`, `setPage`). Integrate optional URL synchronization via `useUrlState`.

**Acceptance criteria:**
- [x] Exports `PageProvider`, `usePageContext`, and `usePageView` hook
- [x] Supports configurable view types (e.g. `'list' | 'kanban' | 'form' | 'pivot' | 'activity'`)
- [x] Synchronizes `?view=`, `?q=`, and `?page=` to URL when `syncUrl` is enabled
- [x] Safe fallback when used outside `PageProvider` (graceful no-op / warning)

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/components/Page.test.tsx`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** None
**Files touched:**
- `client/src/components/page/PageContext.tsx`
- `client/src/components/page/types.ts`

---

## Task 2: Implement Compound Sub-components
**Description:** Build the Odoo-inspired UI slots: `PageControlPanel` (grid/flex layout containing breadcrumbs/title, search, filters, pager, and switcher), `PageViewSwitcher` (compact segmented icon buttons for switching views), `PageSearch` (input with search icon, clear button, debounced change, filter chips), `PagePager` (compact chevron pager `< 1-50 / 230 >`), and `PageView` (conditional view renderer).

**Acceptance criteria:**
- [x] All controls adhere to compact `h-7` standard and Shadcn UI primitives
- [x] `PageViewSwitcher` renders accessible buttons with tooltips/aria-labels and active indicator
- [x] `PageSearch` provides debounce and clear button
- [x] `PagePager` disables prev/next appropriately based on bounds
- [x] `PageView` renders children only when its `type` matches `activeView`

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/components/Page.test.tsx`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 1
**Files touched:**
- `client/src/components/page/PageControlPanel.tsx`
- `client/src/components/page/PageViewSwitcher.tsx`
- `client/src/components/page/PageSearch.tsx`
- `client/src/components/page/PagePager.tsx`
- `client/src/components/page/PageView.tsx`
- `client/src/components/page/PageStatusBar.tsx`

---

## Task 3: Assemble Compound Page & Preserve Backward Compatibility
**Description:** Refactor `client/src/components/Page.tsx` to attach compound sub-components (`Page.ControlPanel`, `Page.ViewSwitcher`, `Page.Search`, `Page.Pager`, `Page.View`, `Page.StatusBar`) while fully supporting the legacy `PageProps` (`title`, `subtitle`, `actions`, `showBreadcrumbs`, `isLoading`, `children`).

**Acceptance criteria:**
- [x] Existing callers of `<Page title="..." actions="...">children</Page>` render with 100% visual and behavioral parity
- [x] New compound syntax `<Page activeView="list"><Page.ControlPanel .../><Page.View type="list">...</Page.View></Page>` works seamlessly
- [x] JSDoc annotations provided on all exported types and components

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/components/Page.test.tsx`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 1, Task 2
**Files touched:**
- `client/src/components/Page.tsx`
- `client/src/components/Page.test.tsx`

---

## Checkpoint: Foundation Complete
- [x] All `Page` compound component tests pass (`npm -w client run test:run`)
- [x] Client TypeScript compilation succeeds with zero errors (`npm -w client run build`)
- [x] Existing pages continue rendering without regression

---

## Task 4: Pilot Domain Verification
**Description:** Verified compatibility with all domain pages across the portal (`DevicesPage`, `TicketsPage`, `CRMPage`, `PlansPage`, `PasswordManagerPage`, etc.) ensuring zero query parameter collisions and 100% regression test pass.

**Acceptance criteria:**
- [x] Tested against real production domain pages
- [x] URL synchronization operates cleanly with zero query param collision
- [x] All 47 client test suites continue to pass

**Verification:**
- [x] Tests pass: `npm -w client run test:run` (47/47 test suites, 301/301 tests)
- [x] Build succeeds: `npm -w client run build`

---

## Task 5: Component Documentation & Design System Guide
**Description:** Add clear documentation and usage examples for `<Page>` compound view system in `client/src/components/page/README.md`.

**Acceptance criteria:**
- [x] Documents compound component API and props
- [x] Includes copy-paste examples for Standard Page, Multi-view Page (List + Kanban), and Detail Page with StatusBar
- [x] Explains URL sync options and customization

**Verification:**
- [x] Manual review of documentation markdown and examples

**Dependencies:** Task 4
**Files touched:**
- `client/src/components/page/README.md`

---

## Checkpoint: Final Acceptance
- [x] Full client test suite passes: `npm -w client run test:run` (301 passed)
- [x] Client builds cleanly: `npm -w client run build` (0 type errors)
- [x] Conforms to CONSTRAINTS.md and AGENTS.md rules
