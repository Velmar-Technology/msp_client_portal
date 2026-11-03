# ADR-016: Modern Compound Page Layouts and Settings Architecture

## Status
Accepted

## Date
2026-11-03

## Context

As the MSP Client Portal scaled, multiple feature pages developed inconsistent tab strips, nested card containers, and ad-hoc list layouts:
1. **Unstyled & Stretched Tab Strips**: Raw Radix `<Tabs>` instances used disparate styling across `ByokSettingsPage`, `NotificationPreferencesPage`, and `PlansPage`. In some views, tab triggers inherited `flex-1`, causing them to stretch awkwardly across ultra-wide monitors.
2. **Card-Nesting Traps in Settings**: Settings views enclosed row items inside heavy bordered cards (`Page.ContentCard`), creating visual clutter, excessive padding, and awkward negative margin clipping on bottom action rows.
3. **Disjointed Column Alignment**: Headers, search toolbars, and content bodies frequently broke alignment by using mismatched max-width wrappers (e.g. full-width header paired with `max-w-4xl` body).
4. **Cluttered Icon Prefixes vs. Minimalist Typography**: Setting rows used heavy icon prefixes on every label, reducing scannability and departing from modern SOTA platforms like ElevenLabs.

### Requirements
- **Universal Bubble Tabs Standard**: All tabbed views must use `<Page.Tabs>` / `<Page.Notebook>` with `variant="bubble"` as the default, rendering compact non-expanding pills (`flex-none shrink-0`) that scroll cleanly on mobile.
- **Card-Less Settings Lists**: Settings and account views must use `<Page.SettingRow>` directly on the page surface with hairline dividers (`divide-y divide-border/50`), pure text-first minimalist labels, and right-aligned action triggers.
- **Dialog-Driven Inline Edits**: Field updates (Name, Phone, Tax ID, Password) must open focused, accessible modal dialogs rather than bulky inline form fields.
- **Clean Flat Danger Zones**: Destructive actions (e.g. account deletion) must be styled as flat list rows with red label text and red outline buttons, without heavy pink background boxes.
- **Unified Column Containment**: Headers, tabs, and list rows must align within a unified max-width column (`max-w-3xl` or `max-w-4xl`).

---

## Decision

We formalized the **Modern Compound Page Layout and Settings Pattern** across the design system and portal views:

### 1. Universal Bubble Tab Navigation (`PageNotebook.tsx`)

`PageNotebook` and `Page.Tabs` default to `variant="bubble"` with touch-friendly single-row horizontal scrolling:

```tsx
<Page.Tabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  tabs={[
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security & Password", icon: ShieldCheck },
    { id: "api-keys", label: "API Keys", icon: KeyRound },
  ]}
/>
```

* **Default Variant**: Defaults to `"bubble"` (backward-compatible with explicit `variant="line"` or `variant="pill"`).
* **Non-Expanding Pills**: Triggers enforce `flex-none shrink-0` to tightly hug their labels.
* **Mobile Touch Scroll**: `TabsList` enforces `overflow-x-auto no-scrollbar scroll-smooth max-w-full` to prevent messy multi-line wrapping on mobile devices.

### 2. Card-Less Settings Rows (`PageSettingRow.tsx`)

Settings pages compose rows using `<Page.SettingRow>` inside a `divide-y divide-border/50` column:

```tsx
<div className="max-w-3xl space-y-6">
  <div className="divide-y divide-border/50">
    <Page.SettingRow
      label="Full Name"
      description={user?.name || "—"}
      action={
        <Button variant="outline" size="sm" onClick={() => setNameModalOpen(true)}>
          Update Name
        </Button>
      }
    />
    <Page.SettingRow
      danger
      label="Delete Entire Account"
      description="Permanently delete your entire account across all workspaces."
      action={
        <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
          Delete Account
        </Button>
      }
    />
  </div>
</div>
```

* **Text-First Minimalist Typography**: Labels avoid icon clutter, optimizing scannability.
* **Action Slots**: Right-aligned buttons, dropdown selects, and status chips standardizing on `h-8` heights.
* **Flat Danger Zone**: Destructive rows use `danger={true}` to apply red text (`text-destructive font-semibold`) and red button styling without pink container blocks.

---

### 3. The 1–3 Page Consolidation Rule (In-Page Tabs vs Sidebar Sprawl)

To prevent sidebar bloat and navigation fragmentation across the portal:
* **Threshold**: If a feature module or sub-domain has **1 to 3 distinct sub-views** (e.g. `Equipos TI` and `Consumibles`), do **NOT** split them into separate sidebar sub-routes or collapsible sidebar accordions.
* **Single Route with In-Page Tabs**: Consolidate the views into a single canonical top-level route (e.g. `/assets`) using `<Page.Tabs>` (variant `"bubble"`).
* **URL State Synchronization**: Synchronize tab state with the URL using `useUrlState({ getParam, setParam })` (e.g. `/assets?tab=consumables`). This preserves deep linking, bookmarking, and browser back/forward navigation without route duplication.
* **Contextual Action Header**: The primary page action button (e.g. `<Page.Actions>`) dynamically responds to the active tab (e.g. `+ Nuevo Activo` on `it_assets` vs `+ Agregar Consumible` on `consumables`).
* **Flat Sidebar Manifest**: The domain manifest (`manifest.ts`) registers a single flat `navItem` without nested `items`, eliminating unnecessary chevron dropdowns.

---

## Consequences

### Positive
- **Visual Consistency**: Every tabbed view and settings page across the portal adheres to the same clean ElevenLabs aesthetic.
- **Mobile Usability**: Tabs never wrap onto multiple broken lines; mobile users smoothly swipe through pills.
- **Developer Ergonomics**: Developers compose complete settings pages with `<Page.SettingRow>` in seconds without writing repetitive CSS dividers.
- **Accessibility & Touch**: All interactive pill triggers and action buttons meet WCAG tap target and focus ring requirements.

### Negative
- Raw Radix `<Tabs>` in feature routes are deprecated in favor of `<Page.Tabs>`. Existing custom tab components must follow this compound contract.
