# CRM Migration to `<Page />` View Modes Architecture

## Problem Statement
How might we migrate the CRM pipeline from bespoke, fragmented view toggling and stacked widget layouts to the enterprise `<Page>` view architecture (`Page.ViewSwitcher`, `Page.View`, `Page.Toolbar`), elevating sales workflow density with native List, Kanban, Activity Calendar, and Pipeline Analytics Graph modes?

---

## Evaluation & Direction Synthesis

### Explored Directions & Trade-off Matrix

| Dimension | Direction A: Minimalist Parity | Direction B: Expanded CRM Suite (Chosen) | Direction C: Full Odoo Record Refactor |
| :--- | :--- | :--- | :--- |
| **Scope** | Only wrap existing Table & Kanban in `<Page.View>` | Standardize List & Kanban + native Calendar & Pipeline Graph | Rewrite detail sheet into `<Page.Sheet>` & `<Page.Notebook>` |
| **User Value** | Low (cosmetic standardization) | **High** (unified sales pipeline, calendar follow-ups, visual analytics) | Medium-High (higher overhaul cost for marginal gain over sheet) |
| **Feasibility** | Immediate (< 1 hr) | **High** (< 3 hrs, reuses `Page.Calendar` & `Page.Graph`) | Medium-Low (requires re-architecting 700-line sheet + sub-dialogs) |
| **Differentiation** | Standard UI | **Compelling** (interactive sales workstation with instant view switches) | High UI consistency, but high migration risk |

---

## Recommended Direction: Expanded CRM Suite

Adopt the **Expanded CRM Suite** architecture for `CRMPage.tsx`, standardizing view orchestration on the portal's design system:

1. **Native Multi-View Orchestration via `<Page>`**:
   - Register four first-class views in `<Page availableViews={[...]} defaultView="list">`:
     - **List (`list`)**: The dense `CRMDataTable` with sorting, search, stage filters, and bulk operations.
     - **Kanban (`kanban`)**: The visual sales pipeline stages board (`CRMKanbanBoard`).
     - **Calendar (`calendar`)**: Interactive scheduled follow-ups, demo calls, and quotation expiration timeline powered by `<Page.Calendar>`.
     - **Graph (`graph`)**: Real-time sales funnel and pipeline value distribution by stage and win/loss ratio powered by `<Page.Graph>`.
   - Replace the bespoke `<ViewToggle>` in `Page.Actions` with `<Page.ViewSwitcher>` placed in `<Page.Controls>` within `<Page.Toolbar>`.

2. **Persistent KPI Strip & De-cluttered Workspace**:
   - Keep the 4 primary KPI `StatCard` metrics (`Pipeline Value`, `Won Revenue`, `Proposals`, `Win Rate`) pinned across all views for at-a-glance executive visibility.
   - Relocate the vertical "Due Follow-ups" list block out of the main layout flow into the dedicated **Calendar view**, eliminating layout clutter and giving sales reps a true scheduling cockpit.

3. **URL State Synchronization & Backwards Compatibility**:
   - Migrate URL parameter convention from `?view=table` to `?view=list`.
   - Implement seamless alias handling: incoming URLs with `?view=table` transparently map to `list` without breaking legacy bookmarks or navigation links.
   - Persist query params (`?view=`, `?search=`, `?stage=`, `?priority=`) via `useUrlState`.

---

## Architecture & Component Blueprint

```tsx
<Page
  activeView={paramView}
  onViewChange={handleViewChange}
  defaultView="list"
  availableViews={[
    { value: "list", label: t("crm.views.list", "List"), icon: LayoutList, title: t("crm.views.list", "List") },
    { value: "kanban", label: t("crm.views.kanban", "Kanban"), icon: Kanban, title: t("crm.views.kanban", "Kanban") },
    { value: "calendar", label: t("crm.views.calendar", "Activities"), icon: Calendar, title: t("crm.views.calendar", "Activities") },
    { value: "graph", label: t("crm.views.graph", "Analytics"), icon: BarChart3, title: t("crm.views.graph", "Analytics") },
  ]}
  totalCount={totalLeads}
  defaultPage={paramPage}
  defaultPageSize={filters.limit || 10}
>
  <Page.Header>
    <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
    <Page.HeaderRow>
      <Page.TitleGroup>
        <Page.Title>{t("crm.title")}</Page.Title>
        <Page.Description>{t("crm.subtitle")}</Page.Description>
      </Page.TitleGroup>
      <Page.Actions maxVisible={3}>
        <Button variant="outline" size="sm" onClick={openCustomPlanStudio}>
          <Sparkles className="size-3.5" />
          <span>{t("crm.customPlan.btnTitle")}</span>
        </Button>
        <Button size="sm" onClick={openNewLeadModal}>
          <Plus className="size-3.5" />
          <span>{t("crm.newLead")}</span>
        </Button>
      </Page.Actions>
    </Page.HeaderRow>

    <Page.Toolbar>
      <Page.Filters>
        {/* Stage & Priority select filters */}
      </Page.Filters>
      <Page.Controls>
        <Page.Pager />
        <Page.ViewSwitcher />
      </Page.Controls>
    </Page.Toolbar>
  </Page.Header>

  {/* Persistent Executive KPI Header */}
  <section aria-label="CRM Metrics">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title={t("crm.stats.pipelineValue")} value={`$${stats?.pipelineValue || 0}`} ... />
      <StatCard title={t("crm.stats.wonRevenue")} value={`$${stats?.wonRevenue || 0}`} ... />
      <StatCard title={t("crm.stats.proposals")} value={stats?.leadsInProposition || 0} ... />
      <StatCard title={t("crm.stats.winRate")} value={`${stats?.conversionRate || 0}%`} ... />
    </div>
  </section>

  {/* First-Class Multi-Views */}
  <Page.View type="list">
    <CRMDataTable ... />
  </Page.View>

  <Page.View type="kanban">
    <CRMKanbanBoard ... />
  </Page.View>

  <Page.View type="calendar">
    <Page.Calendar
      events={calendarActivities}
      onEventClick={(evt) => openLeadDetail(evt.data.leadId)}
      onDateClick={(date) => openScheduleModal(date)}
    />
  </Page.View>

  <Page.View type="graph">
    <Page.Graph
      title={t("crm.analytics.pipelineByStage")}
      subtitle={t("crm.analytics.stageDistribution")}
      data={stagePipelineData}
      valuePrefix="$"
      defaultType="bar"
    />
  </Page.View>

  {/* Detail Sheet & Modals */}
  <CRMLeadDetailSheet ... />
  <CRMNewLeadModal ... />
</Page>
```

---

## Key Assumptions to Validate

- [ ] **Must Be True (Dealbreaker):** `upcomingActivities` data from `GET /crm/activities` provides valid `due_date` timestamps parseable into `Date` objects for `Page.Calendar`.
- [ ] **Must Be True (Dealbreaker):** Legacy URLs with `?view=table` must automatically normalize to `list` without causing infinite navigation re-renders or losing existing query filters (`?search=`, `?stage=`).
- [ ] **Should Be True (Important):** `Page.Graph` handles empty datasets gracefully when a tenant has zero leads or pipeline value without rendering broken SVG artifacts.
- [ ] **Might Be True (Nice to Have):** Clicking an activity in `Page.Calendar` can directly focus the activity tab inside `CRMLeadDetailSheet`.

---

## MVP Scope

### In Scope
1. **View Migration (`CRMPage.tsx`)**:
   - Replace `<ViewToggle>` with native `<Page.ViewSwitcher />`.
   - Wrap view targets in `<Page.View type="list">`, `<Page.View type="kanban">`, `<Page.View type="calendar">`, and `<Page.View type="graph">`.
   - Add URL parameter normalization: `table` $\rightarrow$ `list`.
2. **Activity Calendar Integration**:
   - Transform `upcomingActivities` (and activity logs with due dates) into `PageCalendarEvent[]` with priority color coding (`variant: "primary" | "warning" | "destructive"`).
   - On calendar event click, open `CRMLeadDetailSheet` directly for that lead.
3. **Pipeline Analytics Graph Integration**:
   - Map `stats.stageBreakdown` (`NEW`, `QUALIFIED`, `PROPOSITION`, `NEGOTIATION`, `WON`, `LOST`) into `PageGraphDataPoint[]` showing total value and lead count.
   - Support toggling between Bar, Line, and Donut SVG representations.
4. **i18n Localization**:
   - Ensure all new view labels (`crm.views.list`, `crm.views.kanban`, `crm.views.calendar`, `crm.views.graph`, etc.) are declared in `en_US.json` and `es_DO.json`.
5. **Testing**:
   - Update `CRMPage.test.tsx` to verify tab transitions, view switcher rendering, and URL query preservation.

---

## Not Doing (and Why)

- **Converting `CRMLeadDetailSheet` to `<Page.Sheet>` & `<Page.StatusBar>` full-page route**:
  - *Reason:* The slide-over drawer pattern (`Sheet`) is deeply integrated with quotation generation, subscription conversion, and multi-tab activity logs. Refactoring it into a separate route (`/crm/leads/:id`) exceeds the scope of view mode migration and would break user context during quick pipeline reviews.
- **Custom drag-and-drop report builder**:
  - *Reason:* `<Page.Graph>` provides clean, built-in Bar/Line/Donut visualizations that satisfy 95% of pipeline monitoring needs without introducing external heavy charting libraries.
- **Replacing `CRMDataTable` pagination with `<Page.Pager>` immediately**:
  - *Reason:* `CRMDataTable` already encapsulates TanStack table pagination and column sorting; passing pagination state through `Page.Pager` is a nice-to-have optimization deferred to a subsequent cleanup phase.

---

## Open Questions & Next Steps

1. **Calendar Default Granularity:** Should clicking an empty date cell in `Page.Calendar` trigger the `CRMNewLeadModal` with the date pre-filled, or trigger a "Schedule Follow-up Activity" modal?
2. **Analytics Graph Metric:** Should the default graph show **Dollar Pipeline Value** or **Lead Volume Count**? (Recommended: Pipeline Value with a toggle for count).
