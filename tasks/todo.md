# Tasks: DevicesPage Migration to `<Page />` View Modes Architecture

## Task 1: Add Devices View Mode i18n Localization Keys
**Description:** Add localization strings for devices view modes (`devices.views.list`, `devices.views.tiled`, `devices.views.rmm`, `devices.views.graph`) and fleet analytics in `client/src/locales/en_US.json` and `client/src/locales/es_DO.json`.

**Acceptance criteria:**
- [x] Added translations for all 4 view mode labels in `en_US.json`
- [x] Added translations for all 4 view mode labels in `es_DO.json`
- [x] Added translations for analytics chart titles and subtitles
- [x] Both JSON files parse without syntax errors

**Verification:**
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** None
**Files likely touched:**
- `client/src/locales/en_US.json`
- `client/src/locales/es_DO.json`

---

## Task 2: Refactor DevicesPage.tsx Root Container & View Modes
**Description:** Refactor `DevicesPage.tsx` root container to pass `activeView`, `onViewChange`, `defaultView="list"`, and `availableViews` to `<Page>`. Position `<Page.ViewSwitcher>` inside `<Page.Controls>` within `<Page.Toolbar>`. Map legacy `?tab=rmm` to `rmm` and `?tab=devices` to `list`, while maintaining dual sync for legacy compatibility.

**Acceptance criteria:**
- [x] `<Page>` is configured with `availableViews` covering `list`, `tiled`, `rmm`, and `graph`
- [x] `<Page.ViewSwitcher>` is placed in `<Page.Controls>` inside `<Page.Toolbar>`
- [x] Legacy `?tab=rmm` activates the `rmm` view
- [x] Default view is `list`
- [x] Consolidated duplicate `ViewToggle` and middle `Tabs` bar

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Tests pass: `npm -w client run test:run -- src/features/equipment/pages/DevicesPage.test.tsx`

**Dependencies:** Task 1
**Files likely touched:**
- `client/src/features/equipment/pages/DevicesPage.tsx`

---

## Task 3: Implement Dedicated View Slots (list, tiled, rmm, graph)
**Description:** Add `<Page.View>` slots for all 4 views in `DevicesPage.tsx`, with `list` rendering `DataTable`, `tiled` rendering responsive `DeviceCard` grid with pagination, `rmm` rendering `RmmDashboard`, and `graph` rendering `<Page.Graph>` fleet analytics.

**Acceptance criteria:**
- [x] `<Page.View type="list">` contains `DeviceToolbar` and `DataTable`
- [x] `<Page.View type="tiled">` contains `DeviceToolbar`, `DeviceCard` grid, and pagination
- [x] `<Page.View type="rmm">` contains `RmmDashboard`
- [x] `<Page.View type="graph">` contains `<Page.Graph>` components showing status & OS allocation
- [x] Modals and confirmation dialogs remain accessible across all views

**Verification:**
- [x] Build succeeds: `npm -w client run build`
- [x] Tests pass: `npm -w client run test:run -- src/features/equipment/pages/DevicesPage.test.tsx`

**Dependencies:** Task 2
**Files likely touched:**
- `client/src/features/equipment/pages/DevicesPage.tsx`

---

## Task 4: Expand DevicesPage.test.tsx for All View Modes and Legacy Fallback
**Description:** Update `DevicesPage.test.tsx` with unit tests validating that all four views render when selected, that the view switcher operates properly, and that legacy `?tab=rmm` correctly defaults to the RMM telemetry view.

**Acceptance criteria:**
- [x] Test verifies that default view is `list`
- [x] Test verifies switching to `tiled` renders cards grid
- [x] Test verifies switching to `rmm` renders RMM dashboard
- [x] Test verifies switching to `graph` renders fleet analytics
- [x] Test verifies that providing `?tab=rmm` directly renders the RMM view

**Verification:**
- [x] Tests pass: `npm -w client run test:run -- src/features/equipment/pages/DevicesPage.test.tsx`
- [x] Full client test suite passes: `npm -w client run test:run`
- [x] Build succeeds: `npm -w client run build`

**Dependencies:** Task 3
**Files likely touched:**
- `client/src/features/equipment/pages/DevicesPage.test.tsx`

---

### Checkpoint: Complete Verification
- [x] Full client test suite passes: `npm -w client run test:run` (all test suites green)
- [x] Zero TypeScript compile errors: `npm -w client run build`
- [x] Definition of Done satisfied per `AGENTS.md`

