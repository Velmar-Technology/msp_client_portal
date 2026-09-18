# Unified Compound Slot Architecture for `<Page />`

## Problem Statement
How might we replace fragmented header props and disparate control panels with a composable, strict compound slot system (`Page.Header`, `Page.Actions`, `Page.Toolbar`, `Page.Tabs`) that natively handles responsive action overflow, sticky glassmorphism headers, and unifies page layouts across the portal?

## Recommended Direction
Deprecate monolithic header props on `<Page>` (`title`, `subtitle`, `actions`, `tabsSlot`) and merge the responsibilities of `PageControlPanel` into a cohesive `<Page.Header>` compound suite:

1. **`<Page.Header sticky={boolean}>`**: Master container managing vertical rhythm, optional sticky pinning (`top-0 z-20 backdrop-blur-md bg-background/80`), and clean bottom borders.
2. **`<Page.TitleGroup>` & `<Page.Title>`**: Encapsulates breadcrumbs, back button, title heading (`Page.Title`), description/subtitles (`Page.Description`), and status badges.
3. **`<Page.Actions maxVisible={n}>`**: Responsive action slot. Displays the first `n` primary actions and automatically collapses remaining secondary actions into a compact `MoreHorizontal` dropdown menu (`DropdownMenu`).
4. **`<Page.Toolbar>`**: Dedicated slot for data controls, unifying search (`Page.Search`), filter chips/popovers (`Page.Filters`), pagination (`Page.Pager`), and view switchers (`Page.ViewSwitcher`).
5. **`<Page.Tabs>` / `<Page.Notebook>`**: Sub-navigation slot attached to the base of the header with clean `border-b` active line styling and URL query sync (`?tab=...`).

To protect existing feature pages, `PageRoot` maintains a backward-compatible adapter for existing props (`title`, `subtitle`, `actions`, `tabs`, `tabsSlot`) with `@deprecated` annotations.

## Component Slot Blueprint

```tsx
<Page>
  <Page.Header sticky>
    {/* Breadcrumbs Row */}
    <Page.Breadcrumbs />

    {/* Identity & Action Bar */}
    <Page.HeaderRow>
      <Page.TitleGroup>
        <Page.Back to="/tickets" />
        <Page.Title>Tickets</Page.Title>
        <Badge variant="secondary">Active (24)</Badge>
        <Page.Description>Monitor and triage enterprise support requests</Page.Description>
      </Page.TitleGroup>

      <Page.Actions maxVisible={3}>
        <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>
        <Button variant="outline" size="sm" onClick={handleBulkAssign}>Bulk Assign</Button>
        <Button size="sm" onClick={handleCreate}>New Ticket</Button>
      </Page.Actions>
    </Page.HeaderRow>

    {/* Search, Filter & View Controls (unified ControlPanel) */}
    <Page.Toolbar>
      <Page.Search placeholder="Search tickets..." />
      <Page.Filters>
        {/* Domain filter dropdowns or date range pickers */}
      </Page.Filters>
      <Page.Controls>
        <Page.Pager />
        <Page.ViewSwitcher />
      </Page.Controls>
    </Page.Toolbar>

    {/* Sub-Navigation Tabs */}
    <Page.Tabs defaultTab="all" syncUrl paramKey="tab">
      <Page.Tab id="all" label="All Tickets" badge="42" />
      <Page.Tab id="unassigned" label="Unassigned" badge="5" />
      <Page.Tab id="urgent" label="Urgent SLA" badge="1" />
    </Page.Tabs>
  </Page.Header>

  {/* Page Views & Content */}
  <Page.View type="list"><TicketsTable /></Page.View>
  <Page.View type="kanban"><TicketsKanban /></Page.View>
</Page>
```

## Key Assumptions to Validate
- [ ] **Action Overflow Child Parsing:** `<Page.Actions>` cleanly handles standard `<Button>` children, custom triggers, and disabled states when generating overflow dropdown items.
- [ ] **Sticky Scroll Geometry:** Sticky positioning (`top-0 z-20`) plays nicely with main layout wrappers (`overflow-y-auto` main container vs window scroll).
- [ ] **Backward Compatibility:** Existing pages using `<Page title="X" actions={<Button />}>` render identically without regressions.
- [ ] **Control Height Uniformity:** All buttons, search inputs, and dropdown triggers in `Page.Actions` and `Page.Toolbar` strictly adhere to the `h-7` (28px) standard defined in `AGENTS.md`.

## MVP Scope
- **In Scope:**
  - Create `PageHeader`, `PageHeaderRow`, `PageTitleGroup`, `PageTitle`, `PageDescription`, `PageActions`, and `PageToolbar` inside `client/src/components/page/`.
  - Implement responsive overflow logic with `maxVisible` in `PageActions` using `DropdownMenu`.
  - Add `sticky` backdrop blur styling to `PageHeader`.
  - Wire compound exports into `Page` (`Page.Header`, `Page.TitleGroup`, `Page.Actions`, `Page.Toolbar`, etc.) in `client/src/components/Page.tsx`.
  - Keep legacy props functioning via internal adapter in `PageRoot`.
  - Migrate representative pages (e.g. `TicketsPage.tsx`) to validate developer ergonomics.
- **Out of Scope:**
  - Bulk migrating all 40+ pages in one pull request.
  - Dynamic drag-and-drop customizable toolbars.
  - Floating action buttons (FAB) for mobile.

## Not Doing (and Why)
- **Monolithic Prop Expansion (`actionsSecondary`, `headerExtras`):** Rejected because it encourages prop bloat and makes custom layouts fragile.
- **Breaking existing pages by removing legacy props immediately:** Rejected to maintain zero regression in CI and continuous delivery.
- **Portals / Global Teleportation:** Rejected because explicit compound hierarchy is easier to trace, debug, and typecheck than detached portals.
