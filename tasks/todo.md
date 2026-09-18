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

---

## Phase 3: Introduce Odoo View System to TicketsPage
- [x] Task 6: Implement `TicketKanbanBoard.tsx` component with columns for Open, In Progress, Resolved, and Closed
- [x] Task 7: Refactor `TicketsPage.tsx` with `<Page.ControlPanel>`, `<Page.ViewSwitcher>`, `<Page.View type="list">`, and `<Page.View type="kanban">`
- [x] Task 8: Update `TicketsPage.test.tsx` with view switching test coverage
- [x] Checkpoint: Full test suite and typecheck pass cleanly

---

## Phase 4: Introduce Odoo Form View Architecture
- [x] Task 9: Implement `<Page.Sheet>` (elevated paper container) and `<Page.FormHeader>` (title block with stat buttons slot)
- [x] Task 10: Implement `<Page.StatBox>` and `<Page.StatButton>` (smart metric counters with icons, labels, badges)
- [x] Task 11: Implement `<Page.Notebook>` and `<Page.NotebookTab>` (sub-sheet tabs with Radix UI tabs, badge counters, and URL synchronization)
- [x] Task 12: Implement `<Page.FieldGroup>` and `<Page.Field>` (labeled multi-column key-value attribute layouts)
- [x] Task 13: Attach Form View subcomponents to `Page` compound component in `Page.tsx` and re-export in `page/index.ts`
- [x] Task 14: Add unit tests in `Page.test.tsx` covering all Form View components (11/11 passed)
- [x] Task 15: Pilot Form View in `TicketDetailPage.tsx` using `<TicketStatusBar>` (stage pipeline & actions) and `<Page.Sheet>` with `<TicketDetailHeader>` (FormHeader with smart stat buttons for Chatter, Device, and SLA)
- [x] Checkpoint: Full client test suite (47/47 passed, 306/306 tests passed) and client build (0 type errors) pass cleanly

---

## Phase 5: Introduce Dashboard, Date/Calendar, and Graph Views to Page
- [x] Task 16: Expand type contracts in `types.ts` and register default view switcher icons for `"dashboard"`, `"calendar"`, and `"graph"`
- [x] Task 17: Implement Dashboard View components (`PageDashboard`, `PageDashboardKpi`, `PageDashboardSection`) with responsive grid and KPI metrics
- [x] Task 18: Implement Date/Calendar View components (`PageCalendar`, `PageCalendarHeader`, `PageCalendarGrid`) using `date-fns` with month navigation and item markers
- [x] Task 19: Implement Graph View components (`PageGraph`, `PageGraphControls`) with SVG Bar, Line, and Donut charts and compact `h-7` controls
- [x] Task 20: Assemble compound components in `Page.tsx`, re-export in `page/index.ts`, add unit tests in `Page.test.tsx`, and verify full test suite and build

---

## Phase 6: Tab Navigation Support for Page
- [x] Task 21: Added `<Page.Tabs>` and `<Page.Tab>` aliases for `<Page.Notebook>` and `<Page.NotebookTab>` with declarative array `tabs?: PageTabItem[]` support, `variant="default" | "line"`, and `tabsListClassName`
- [x] Task 22: Added top-level `tabs`, `activeTab`, `defaultTab`, `onTabChange`, `tabParamKey`, `syncTabUrl`, and `tabsSlot` to `PageRoot` / `PageProps`
- [x] Task 23: Added `tabsSlot` support to `PageControlPanel`
- [x] Task 24: Added comprehensive unit tests in `Page.test.tsx` and documented in `client/src/components/page/README.md`
- [x] Checkpoint: Full test suite (48/48 suites, 317/317 tests) and client build (0 type errors) pass cleanly

---

## Phase 7: Unified Compound Slot Architecture for `<Page />`

### Task 25: Define TypeScript Contracts for Header Slots
**Description:** Define props and interfaces for `<Page.Header>` and all compound subcomponents in `client/src/components/page/types.ts`.

**Acceptance criteria:**
- [x] Defines `PageHeaderProps` (`sticky?: boolean`, `bordered?: boolean`, `className?: string`, `children?: React.ReactNode`)
- [x] Defines `PageHeaderRowProps`, `PageTitleGroupProps`, `PageTitleProps`, `PageDescriptionProps`, `PageBackProps`
- [x] Defines `PageActionsProps` (`maxVisible?: number`, `overflowLabel?: string`)
- [x] Defines `PageToolbarProps`, `PageFiltersProps`, `PageControlsProps`

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** None
**Files touched:**
- `client/src/components/page/types.ts`
**Estimated scope:** Small (1 file)

---

### Task 26: Implement Core Header Layout Slots
**Description:** Implement `PageHeader`, `PageHeaderRow`, `PageTitleGroup`, `PageTitle`, `PageDescription`, and `PageBack` in `client/src/components/page/PageHeader.tsx`.

**Acceptance criteria:**
- [x] `PageHeader` supports `sticky` with glassmorphic blur `sticky top-0 z-20 backdrop-blur-md bg-background/85`
- [x] `PageHeaderRow` aligns title group on left and actions on right with responsive wrapping
- [x] `PageTitleGroup` supports title, subtitle, badges, and back button
- [x] `PageBack` renders compact `h-7 w-7` icon button with navigation or `onClick`

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 25
**Files touched:**
- `client/src/components/page/PageHeader.tsx`
**Estimated scope:** Small (1 file)

---

### Task 27: Implement Responsive Action Overflow (`PageActions`)
**Description:** Build `PageActions` with automatic overflow dropdown handling when action count exceeds `maxVisible`.

**Acceptance criteria:**
- [x] Renders primary actions directly when count <= `maxVisible`
- [x] Slices actions beyond `maxVisible` into a compact `MoreHorizontal` dropdown menu (`h-7 px-2`)
- [x] Preserves action click handlers, labels, icons, and disabled states in dropdown items
- [x] Adheres to `h-7` compact button standards

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 26
**Files touched:**
- `client/src/components/page/PageHeader.tsx`
**Estimated scope:** Small (1 file)

---

### Task 28: Implement Unified Toolbar Slots (`PageToolbar`)
**Description:** Implement `PageToolbar`, `PageFilters`, and `PageControls` inside `client/src/components/page/PageHeader.tsx` to unify search, filters, pagination, and view switcher.

**Acceptance criteria:**
- [x] `PageToolbar` lays out search and filters on the left/center, controls on the right
- [x] Integrates seamlessly with existing `PageSearch`, `PagePager`, and `PageViewSwitcher`
- [x] Fully responsive on mobile (flex-col on small screens, flex-row on desktop)

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 27
**Files touched:**
- `client/src/components/page/PageHeader.tsx`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Slot Primitives Implemented
- [x] TypeScript compilation passes cleanly (`npm -w client run build`)

---

### Task 29: Compound Assembly in Page.tsx & Backward Compatibility Adapter
**Description:** Attach all header subcomponents to `Page` compound component in `client/src/components/Page.tsx`, export them in `client/src/components/page/index.ts`, and adapt legacy props (`title`, `subtitle`, `actions`, `tabs`, `tabsSlot`) with `@deprecated` annotations.

**Acceptance criteria:**
- [x] `Page.Header`, `Page.HeaderRow`, `Page.TitleGroup`, `Page.Title`, `Page.Description`, `Page.Actions`, `Page.Toolbar`, `Page.Filters`, `Page.Controls`, and `Page.Back` are accessible on `Page`
- [x] Legacy pages using `<Page title="..." actions={...}>` render identically with zero regressions
- [x] All new components are exported in `client/src/components/page/index.ts`

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 28
**Files touched:**
- `client/src/components/Page.tsx`
- `client/src/components/page/index.ts`
**Estimated scope:** Small (2 files)

---

### Task 30: Comprehensive Unit Test Suite
**Description:** Write unit tests in `client/src/components/page/PageHeader.test.tsx` verifying sticky header styling, action overflow behavior, and compound slot composition.

**Acceptance criteria:**
- [x] Tests verify sticky header class injection and border rendering
- [x] Tests verify action overflow when children count > `maxVisible`
- [x] Tests verify legacy props continue to render properly

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/components/page/PageHeader.test.tsx`
- [x] Full test suite passes: `npm -w client run test:run`

**Dependencies:** Task 29
**Files touched:**
- `client/src/components/page/PageHeader.test.tsx`
**Estimated scope:** Small (1 file)

---

### Task 31: Pilot Migration on TicketsPage
**Description:** Adopt the new `<Page.Header>`, `<Page.Actions maxVisible={3}>`, and `<Page.Toolbar>` on `client/src/features/tickets/pages/TicketsPage.tsx` to validate real-world developer ergonomics.

**Acceptance criteria:**
- [x] `TicketsPage.tsx` uses `<Page.Header>`, `<Page.Actions>`, `<Page.Toolbar>` seamlessly
- [x] All tickets tests pass without regression

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/features/tickets/pages/TicketsPage.test.tsx`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 30
**Files touched:**
- `client/src/features/tickets/pages/TicketsPage.tsx`
**Estimated scope:** Small (1-2 files)

---

### Task 32: Design System Guide & Documentation
**Description:** Update `client/src/components/page/README.md` with complete usage guides, props reference, and code examples for the new compound header architecture.

**Acceptance criteria:**
- [x] Documents all new slots, props, and overflow configuration
- [x] Provides copy-paste examples for standard, sticky, and data list headers

**Verification:**
- [x] Manual review of documentation

**Dependencies:** Task 31
**Files touched:**
- `client/src/components/page/README.md`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Final Acceptance
- [x] Full client test suite passes: `npm -w client run test:run`
- [x] Client builds cleanly: `npm -w client run build`
- [x] Conforms to CONSTRAINTS.md and AGENTS.md rules


