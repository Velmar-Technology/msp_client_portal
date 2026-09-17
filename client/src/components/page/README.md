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

## 2. Record Detail / Form View (`<Page.Sheet>`, `<Page.FormHeader>`, `<Page.Notebook>`)

```tsx
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { MessageSquare, Laptop, Clock } from "lucide-react";

export function TicketDetailPage({ ticket, responses, sla }) {
  const stages = [
    { id: "OPEN", label: "Open" },
    { id: "IN_PROGRESS", label: "In Progress" },
    { id: "RESOLVED", label: "Resolved" },
    { id: "CLOSED", label: "Closed" },
  ];

  return (
    <Page>
      {/* Odoo-style Workflow Status Bar: Actions on Left, Stages on Right */}
      <Page.StatusBar
        currentStageId={ticket.status}
        stages={stages}
        actions={
          <Button size="sm" className="h-7 px-3 text-xs font-semibold">
            Resolve Ticket
          </Button>
        }
      />

      {/* Elevated Record Document Sheet (<sheet>) */}
      <Page.Sheet maxWidth="full" elevation="xs">
        {/* Form Title block with top-right smart buttons */}
        <Page.FormHeader
          title={ticket.title}
          subtitle={`Ticket #${ticket.id.slice(0, 8)} • Opened by ${ticket.reporter_name}`}
          badges={<span className="px-2 py-0.5 text-[9px] rounded-full border">{ticket.status}</span>}
          buttonBox={
            <Page.StatBox>
              <Page.StatButton
                icon={MessageSquare}
                value={responses.length}
                label="Chatter"
                onClick={() => toggleChat()}
              />
              <Page.StatButton
                icon={Laptop}
                value={ticket.device_name}
                label="Device"
              />
              {sla && (
                <Page.StatButton
                  icon={Clock}
                  value={sla.timeLeft}
                  label="SLA"
                />
              )}
            </Page.StatBox>
          }
        />

        {/* Tabbed Sub-Sheets (<notebook>) */}
        <Page.Notebook defaultTab="details">
          <Page.NotebookTab id="details" label="Details">
            <Page.FieldGroup cols={2} title="Record Overview">
              <Page.Field label="Priority">{ticket.priority}</Page.Field>
              <Page.Field label="Category">{ticket.category}</Page.Field>
            </Page.FieldGroup>
          </Page.NotebookTab>

          <Page.NotebookTab id="telemetry" label="Diagnostic Telemetry" icon={Laptop}>
            {/* Flight recorder diagnostics */}
          </Page.NotebookTab>
        </Page.Notebook>
      </Page.Sheet>
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
