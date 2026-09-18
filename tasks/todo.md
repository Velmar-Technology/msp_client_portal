# Tasks: CRM Migration to `<Page />` View Modes Architecture

## Task 1: Add CRM View Mode i18n Localization Keys
**Description:** Add localization strings for CRM view modes (`crm.views.list`, `crm.views.kanban`, `crm.views.calendar`, `crm.views.graph`), activity calendar tooltips/empty state, and pipeline analytics chart labels in `client/src/locales/en_US.json` and `client/src/locales/es_DO.json`.

**Acceptance criteria:**
- [x] Added translations for all 4 view mode labels in `en_US.json`
- [x] Added translations for all 4 view mode labels in `es_DO.json`
- [x] Added translations for pipeline graph titles and empty state messages
- [x] Both JSON files parse without syntax errors

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** None
**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`

**Estimated scope:** XS (2 files)

---

### Checkpoint: Foundations
- [x] Locale files compile cleanly with valid JSON syntax

---

## Task 2: Refactor CRMPage.tsx to Page.ViewSwitcher & URL Normalization
**Description:** Refactor `CRMPage.tsx` root container to pass `activeView`, `onViewChange`, `defaultView="list"`, and `availableViews` to `<Page>`. Remove the custom `<ViewToggle>` from `Page.Actions` and position `<Page.ViewSwitcher>` inside `<Page.Controls>` within `<Page.Toolbar>`. Map legacy `?view=table` to canonical `list`.

**Acceptance criteria:**
- [x] `<Page>` is configured with `availableViews` covering `list`, `kanban`, `calendar`, and `graph`
- [x] `<Page.ViewSwitcher>` is placed in `<Page.Controls>` inside `<Page.Toolbar>`
- [x] Custom `<ViewToggle>` component import and usage in `Page.Actions` is removed
- [x] Legacy `?view=table` URL query parameter transparently activates the `list` view
- [x] Existing `CRMDataTable` is rendered inside `<Page.View type="list">`
- [x] Existing `CRMKanbanBoard` is rendered inside `<Page.View type="kanban">`

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Tests pass: `npm -w client run test:run -- src/features/crm/pages/CRMPage.test.tsx`

**Dependencies:** Task 1
**Files likely touched:**
- `client/src/features/crm/pages/CRMPage.tsx`

**Estimated scope:** S (1 file)

---

## Task 3: Integrate Activity Calendar View via Page.View type="calendar"
**Description:** Add `<Page.View type="calendar">` in `CRMPage.tsx` rendering `<Page.Calendar>`. Transform `upcomingActivities` (and available lead follow-up events) into `PageCalendarEvent[]` with priority color tags (`variant: "primary" | "warning" | "destructive"`). Enable clicking on a calendar event to open the `CRMLeadDetailSheet` for that lead.

**Acceptance criteria:**
- [x] `<Page.View type="calendar">` contains `<Page.Calendar>`
- [x] Activities with valid `due_date` timestamps are converted to `PageCalendarEvent`
- [x] Overdue activities are visually tagged with destructive/warning styling
- [x] Clicking a calendar event triggers `openLeadSheet` with the corresponding lead
- [x] Handles empty activity lists gracefully with a friendly empty state

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Tests pass: `npm -w client run test:run -- src/features/crm/pages/CRMPage.test.tsx`

**Dependencies:** Task 2
**Files likely touched:**
- `client/src/features/crm/pages/CRMPage.tsx`

**Estimated scope:** S (1 file)

---

## Task 4: Integrate Pipeline Analytics Graph View via Page.View type="graph"
**Description:** Add `<Page.View type="graph">` in `CRMPage.tsx` rendering `<Page.Graph>`. Map `stats.stageBreakdown` (`NEW`, `QUALIFIED`, `PROPOSITION`, `NEGOTIATION`, `WON`, `LOST`) to `PageGraphDataPoint[]` displaying pipeline value per stage with prefix `$` and toggleable Bar/Line/Donut modes.

**Acceptance criteria:**
- [x] `<Page.View type="graph">` contains `<Page.Graph>`
- [x] Maps each CRM pipeline stage to a chart data point with appropriate label and dollar value
- [x] Supports interactive switching between Bar, Line, and Donut SVG charts via `Page.Graph`
- [x] Handles zero-dollar or empty pipeline data gracefully without rendering errors

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Tests pass: `npm -w client run test:run -- src/features/crm/pages/CRMPage.test.tsx`

**Dependencies:** Task 3
**Files likely touched:**
- `client/src/features/crm/pages/CRMPage.tsx`

**Estimated scope:** S (1 file)

---

### Checkpoint: View Modes Migration Green
- [x] All four views (`list`, `kanban`, `calendar`, `graph`) switch smoothly without page reload
- [x] Client builds clean with zero type errors (`npm -w client run build`)

---

## Task 5: Expand CRMPage.test.tsx for All View Modes and Legacy Fallback
**Description:** Update `CRMPage.test.tsx` with dedicated unit tests validating that all four views render when selected, that the view switcher operates properly, and that legacy `?view=table` correctly defaults to the list view.

**Acceptance criteria:**
- [x] Test verifies that default view is `list` and displays `CRMDataTable`
- [x] Test verifies switching to `kanban` renders `CRMKanbanBoard`
- [x] Test verifies switching to `calendar` renders `Page.Calendar` and activity events
- [x] Test verifies switching to `graph` renders `Page.Graph` analytics chart
- [x] Test verifies that providing `?view=table` falls back gracefully to `list` view

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/features/crm/pages/CRMPage.test.tsx`
- [x] Full client test suite passes: `npm -w client run test:run`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 4
**Files likely touched:**
- `client/src/features/crm/pages/CRMPage.test.tsx`

**Estimated scope:** M (1 file)

---

### Checkpoint: Complete Verification
- [x] Full client test suite passes: `npm -w client run test:run` (all test suites green)
- [x] Zero TypeScript compile errors: `npm -w client run build`
- [x] Definition of Done satisfied per `AGENTS.md`
