# Page Component & Odoo-Style View Architecture

An enterprise-grade, compound page layout system inspired by Odoo ERP. It provides seamless multi-mode views (List/Table, Kanban, Form/Detail, Analytics), an integrated Control Panel, search with debouncing, compact pagination, and automatic URL state synchronization.

---

## Component Architecture

```
<Page> (Root layout container, inherits MaxWidthWrapper & PageProvider)
  │
  ├── <Page.ControlPanel> (Unified header zone)
  │     ├── Title & Subtitle
  │     ├── Breadcrumbs (Automatic route detection or custom)
  │     ├── Primary Actions (<Button variant="default">)
  │     ├── <Page.Search> (Debounced 300ms, filter chips, '/' shortcut)
  │     ├── <Page.Pager> (Dense '< 1-50 / 230 >' compact pager)
  │     └── <Page.ViewSwitcher> (Segmented h-7 icon buttons: List | Kanban)
  │
  ├── <Page.StatusBar> (Odoo workflow pipeline for detail pages: Draft -> Open -> Resolved)
  │
  ├── <Page.View type="list"> (Rendered when activeView === 'list')
  │     └── <DataTable ... />
  │
  └── <Page.View type="kanban"> (Rendered when activeView === 'kanban')
        └── <KanbanBoard ... />
```

---

## 1. Standard Collection Page (Multi-View Recipe)

```tsx
import { Page } from "@/components/Page";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TicketsPage() {
  return (
    <Page
      defaultView="list"
      availableViews={[
        { value: "list", label: "List", title: "List view" },
        { value: "kanban", label: "Kanban", title: "Kanban board" },
      ]}
      totalCount={totalTickets}
      defaultPage={1}
      defaultPageSize={25}
      syncUrl={true} // Syncs ?view=, ?q=, ?page=
    >
      <Page.ControlPanel
        title="Tickets"
        subtitle="Manage client support issues and SLA assignments"
        actions={
          <Button size="sm" className="h-7 gap-1">
            <Plus className="size-3.5" />
            <span>New Ticket</span>
          </Button>
        }
      />

      <Page.View type="list">
        <TicketsDataTable />
      </Page.View>

      <Page.View type="kanban">
        <TicketsKanbanBoard />
      </Page.View>
    </Page>
  );
}
```

---

## 2. Record Detail / Form Page with StatusBar

```tsx
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";

export function TicketDetailPage({ ticket }) {
  const stages = [
    { id: "OPEN", label: "Open" },
    { id: "IN_PROGRESS", label: "In Progress" },
    { id: "RESOLVED", label: "Resolved" },
    { id: "CLOSED", label: "Closed" },
  ];

  return (
    <Page>
      <Page.ControlPanel
        title={`Ticket #${ticket.ticket_number}`}
        subtitle={ticket.title}
      />

      {/* Odoo-style Status Bar */}
      <Page.StatusBar
        currentStageId={ticket.status}
        stages={stages}
        actions={
          <Button size="sm" variant="outline" className="h-7">
            Assign to Me
          </Button>
        }
        onStageSelect={(stageId) => updateTicketStatus(stageId)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main record details & activity chatter */}
      </div>
    </Page>
  );
}
```

---

## 3. Legacy Compatibility Guarantee

All existing usages of `<Page>` continue to work without any modifications:

```tsx
<Page
  title="Settings"
  subtitle="Manage your profile"
  actions={<Button>Save</Button>}
  showBreadcrumbs={true}
>
  <div>Page Content</div>
</Page>
```

When no compound slots or view props are passed, `<Page>` functions identically to the classic layout container and disables URL state synchronization to avoid conflicts with custom domain hooks.

---

## Design System Guidelines

1. **Control Heights:** All interactive controls in `Page.ControlPanel`, `Page.ViewSwitcher`, `Page.Search`, and `Page.Pager` adhere strictly to the repository standard `h-7` (28px height).
2. **Icons:** Built with `lucide-react` icons sized at `size-3.5` or `size-4`.
3. **URL State:** When `syncUrl={true}`, params default to:
   - `?view=` for active view mode
   - `?q=` for search query
   - `?page=` for current page
   - `?limit=` for page size
4. **i18n Localization:** All UI strings use `useTranslation()` (`t("common.search")`, `t("common.clear")`, `t("common.pagination")`).
