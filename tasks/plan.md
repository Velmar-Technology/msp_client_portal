# Implementation Plan: CRM Migration to `<Page />` View Modes Architecture

## Overview
Migrate the CRM pipeline (`CRMPage.tsx`) from bespoke, fragmented view toggling and stacked widget layouts to the enterprise `<Page>` view architecture (`Page.ViewSwitcher`, `Page.View`, `Page.Toolbar`). This unifies sales operations into four first-class view modes: **List** (`list`), **Kanban** (`kanban`), **Activity Calendar** (`calendar`), and **Pipeline Analytics Graph** (`graph`), while keeping executive KPIs persistently visible and ensuring backwards compatibility for legacy `?view=table` links.

## Architecture Decisions
1. **First-Class View Modes via `<Page availableViews={[...]}>`**:
   - `list`: The existing high-density `CRMDataTable` with sorting, search, stage filters, and bulk actions.
   - `kanban`: Visual stage pipeline board (`CRMKanbanBoard`).
   - `calendar`: Interactive temporal schedule of follow-ups, demo calls, and quotation deadlines using `<Page.Calendar>`.
   - `graph`: Stage-by-stage sales funnel and conversion analytics using `<Page.Graph>`.
2. **Control Height Uniformity & Toolbar Integration**:
   - Remove custom `<ViewToggle>` in `Page.Actions`.
   - Place `<Page.ViewSwitcher>` inside `<Page.Controls>` within `<Page.Toolbar>`, conforming strictly to standard `h-7` (28px).
3. **Executive KPI Persistence**:
   - Keep the top 4 `StatCard` metrics (`Pipeline Value`, `Won Revenue`, `Proposals`, `Win Rate`) pinned below `<Page.Header>` across all views.
   - Relocate the vertical "Due Follow-ups" list block from the main flow into the interactive **Calendar view**, eliminating clutter.
4. **URL Normalization & Backwards Compatibility**:
   - Canonical view modes are `list` and `kanban` (plus `calendar` and `graph`).
   - Any incoming URL with `?view=table` automatically normalizes to `list` without infinite loops or lost search/stage query filters.

## Task List

### Phase 1: Foundations & Translations
- [x] Task 1: Add CRM View Mode i18n Localization Keys in `en_US.json` and `es_DO.json`

### Checkpoint: Foundations
- [x] Locale files compile cleanly with valid JSON syntax

### Phase 2: CRM View Modes Migration
- [x] Task 2: Refactor `CRMPage.tsx` to `<Page.ViewSwitcher>` and URL Normalization (`table` $\rightarrow$ `list`)
- [x] Task 3: Integrate Activity Calendar View via `<Page.View type="calendar">` and `<Page.Calendar>`
- [x] Task 4: Integrate Pipeline Analytics Graph View via `<Page.View type="graph">` and `<Page.Graph>`

### Checkpoint: View Modes Migration Green
- [x] All four views switch smoothly without page reload
- [x] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 3: Verification & Regression Testing
- [x] Task 5: Expand `CRMPage.test.tsx` for All View Modes and Legacy Fallback

### Checkpoint: Complete Verification
- [x] Targeted tests pass: `npm -w client run test:run -- src/features/crm/pages/CRMPage.test.tsx`
- [x] Full client test suite passes: `npm -w client run test:run`
- [x] Client compiles cleanly: `npm -w client run build`

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Empty activity or lead datasets render broken SVG in `Page.Graph` | Medium | Guard with fallback empty states and default zero-value data structures. |
| Incompatible `due_date` format in `Page.Calendar` | Low | Parse ISO strings through `new Date(...)` and filter out invalid/null dates before memoizing events. |
| Legacy bookmark disruption (`?view=table`) | High | Explicit normalization in URL state hook to treat `table` as `list` seamlessly. |

## Open Questions
- None. Requirements and scope confirmed via `/idea-refine` dialogue.
