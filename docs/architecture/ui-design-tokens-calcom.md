# Cal.com Visual Proportions & UI Shell Architecture Specification

**Status:** Canonical Design System Standard  
**Target:** `client/` (React 19 / Vite / Tailwind v4 / shadcn/ui)  
**References:** Local Reference Repo (`.refs/calcom`), `ADR-016` (Compound Layouts), `AGENTS.md` (§6 Frontend Standards)

---

## 1. Executive Summary & Design Principles

This specification establishes the official frontend visual standards for the MSP Client Portal, adapting the minimalist aesthetic, compact visual density, and structured shell hierarchy of **Cal.com** (`.refs/calcom`) while strictly using **shadcn/ui** (Radix UI / Base UI) primitives.

### Core Tenets
1. **Cal.com Shell Hierarchy:** Consistent high-density sidebar, sticky/static top headers (with optional back navigation, title, subtitle, and CTA actions), non-expanding horizontal pill tabs with automatic URL state syncing (`?tab=...`), and unified reading columns.
2. **Strict shadcn/ui Primitives:** All interactive UI elements must use standardized shadcn components (`Button`, `Input`, `Select`, `Tabs`, `Dialog`, `Sheet`, `Card`). Raw, unstyled HTML elements (`<button>`, `<input>`, `<select>`) are strictly forbidden.
3. **Hairline Precision & Micro-Shadows:** Zero heavy drop shadows or thick decorative borders. Interfaces rely on `1px` subtle hairline borders (`border-border/70`, `divide-y divide-border/50`), low-elevation shadows (`shadow-subtle`), and crisp button surface depths (`shadow-button-solid`).
4. **Permissive Outer Card with Interior Hairline Rows:** Outer `<Card>` and `<FormCard>` containers are permitted for grouping, but nested cards are strictly prohibited. Multi-field sections must be organized via interior hairline dividers (`divide-y divide-border/50`) and text-first `<Page.SettingRow>` components.
5. **Flat Danger Zones:** Destructive actions and danger zones must be presented as flat hairline divider rows with red label text (`text-destructive`) and red outline buttons (`border-destructive/40 text-destructive hover:bg-destructive/10`). Saturated pink or solid red background alert boxes are forbidden.

---

## 2. Token Hierarchy & Visual Proportions

All design tokens are defined in [client/src/index.css](file:///C:/Users/eapolanco/Workspace/msp_client_portal/client/src/index.css) using Tailwind v4 `@theme inline` and CSS variables.

### 2.1 Spacing & Height Scale
| Element | Standard Height | Classes | Use Case |
| :--- | :--- | :--- | :--- |
| **Button (Default)** | **28px (`h-7`)** | `h-7 px-3 py-1 text-xs/relaxed rounded-lg` | Primary page CTAs, toolbar actions, dialog buttons |
| **Button (Compact / Icon)** | **24px (`h-6`)** | `h-6 px-2.5 text-xs rounded-md` / `size-6` | Table row actions, back buttons, inline buttons |
| **Button (Micro / XS)** | **20px (`h-5`)** | `h-5 px-2 text-[0.625rem] rounded-md` / `size-5` | High-density status pills, sub-item tags |
| **Button (Large / Hero)** | **32px (`h-8`)** | `h-8 px-3.5 text-xs/relaxed rounded-lg` | Auth forms, wizard entry points |
| **Input / Select Trigger** | **28px (`h-7`)** | `h-7 px-2.5 py-1 text-xs/relaxed rounded-lg` | Standard filters, modal inputs, settings rows |
| **Input (Large / MD)** | **32px (`h-8`)** | `h-8 px-3 py-1.5 text-xs/relaxed rounded-lg` | Search bars, full-width form inputs |

### 2.2 Hairline Borders & Background Layering
```css
/* Light Mode */
--background: #ffffff;
--surface-subtle: #f9f9fb;
--card: #ffffff;
--muted: #f4f4f5;
--border: rgba(0, 0, 0, 0.08);       /* 1px hairline standard */
--border-subtle: rgba(0, 0, 0, 0.04); /* Ultra-subtle interior divider */
--border-muted: rgba(0, 0, 0, 0.02);

/* Dark Mode */
--background: #0e0e11;
--surface-subtle: #18181c;
--card: #141417;
--muted: rgba(255, 255, 255, 0.05);
--border: rgba(255, 255, 255, 0.08); /* 1px hairline standard */
--border-subtle: rgba(255, 255, 255, 0.04);
--border-muted: rgba(255, 255, 255, 0.02);
```

### 2.3 Low-Elevation Micro-Shadows
```css
--shadow-subtle: 0px 2px 3px 0px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.03);
--shadow-subtle-hover: 0px 2px 4px 0px rgba(0, 0, 0, 0.05), 0px 1px 2px -1px rgba(0, 0, 0, 0.04);
--shadow-button-solid: 0px 2px 3px 0px rgba(0, 0, 0, 0.06), 0px 1px 1px 0px rgba(0, 0, 0, 0.08), 1px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 2px 0.4px 0px rgba(255, 255, 255, 0.12) inset;
```

---

## 3. Shell Architecture & Layout Hierarchy

### 3.1 `<PageShell>` Standard Page Container
[client/src/components/layout/PageShell.tsx](file:///C:/Users/eapolanco/Workspace/msp_client_portal/client/src/components/layout/PageShell.tsx) serves as the canonical page container across the application.

```tsx
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Shield, Key } from "lucide-react";

export function SecuritySettingsPage() {
  const tabs = [
    { id: "password", label: "Password", icon: Key },
    { id: "2fa", label: "Two-Factor Auth", icon: Shield },
  ];

  return (
    <PageShell
      title="Security Settings"
      subtitle="Manage your credentials, session access, and recovery keys"
      variant="constrained" /* max-w-4xl mx-auto */
      backPath="/settings"
      syncUrl={true}
      tabParamKey="tab"
      tabs={tabs}
      cta={<Button size="sm">Save Changes</Button>}
    >
      {/* Content rows or FormCard */}
    </PageShell>
  );
}
```

### 3.2 Width Constraints
- **`variant="constrained"` (`max-w-4xl mx-auto w-full`):** Mandatory for Settings, Account Hubs, Profiles, Detail Forms, and Help Center documentation.
- **`variant="narrow"` (`max-w-3xl mx-auto w-full`):** Optional for focused single-column wizards or multi-factor authentication setup.
- **`variant="full"` (`max-w-full w-full`):** Reserved for wide data grids (Tickets, CRM Pipeline Kanban, Telemetry monitoring, Financial ledgers).

### 3.3 Horizontal Sub-Navigation Tabs
- **Pill / Bubble Variant (Default):** Rendered as horizontal non-expanding pill buttons (`overflow-x-auto no-scrollbar`).
  - Active state: `bg-secondary text-foreground font-semibold shadow-subtle`.
  - Inactive state: `text-muted-foreground hover:text-foreground hover:bg-muted/70`.
- **URL Synchronization:** Tabs automatically synchronize with the URL query parameter (`?tab=<id>`) using `useUrlState`.

---

## 4. Component Mapping Reference (Cal.com $\rightarrow$ Portal shadcn)

### 4-Tier Hierarchy Architecture

| Tier | Directory | Canonical Components | Purpose |
| :--- | :--- | :--- | :--- |
| **Tier 1: Primitives** | `client/src/components/ui/` | `<Button>`, `<Input>`, `<Select>`, `<Dialog>`, `<Badge>`, `<DropdownMenu>`, `<Skeleton>` | Low-level shadcn/ui primitives. |
| **Tier 2: Form Groupers** | `client/src/components/shared/` | `<FormCard>`, `<FormCardBody>`, `<Page.SettingGroup>`, `<Page.SettingRow>` | Hairline form grouping containers with `divide-y divide-border/50`. |
| **Tier 3: Layouts & Shells** | `client/src/components/layout/` | `<PageShell>`, `<WizardLayout>`, `<DialogShell>`, `<AppSidebar>`, `<TopNav>` | Top-level page shells, multi-step wizards, and standardized modal dialogs. |
| **Tier 4: Data Displays** | `client/src/components/shared/` | `<EmptyScreen>`, `<ListGroup>`, `<ListItem>`, `<BadgeGroup>`, `<FilterSelect>`, `<Pagination>` | High-density data presentation, listing blocks, and filter controls. |

### Component Equivalencies

| Cal.com Pattern (`.refs/calcom`) | MSP Portal Canonical Component | Usage Rule |
| :--- | :--- | :--- |
| `Shell` / `ShellMain` | `<PageShell>` (`components/layout/PageShell`) | Canonical top-level container for all portal routes. |
| `WizardLayout` | `<WizardLayout>` (`components/layout/WizardLayout`) | Centered multi-step onboarding/setup shell with segmented progress bar. |
| `Dialog` / `ConfirmationDialogContent` | `<DialogShell>` (`components/layout/DialogShell`) | Standard modal dialog with icon badge, hairline body, and micro-shadow action footer. |
| `EmptyScreen` | `<EmptyScreen>` (`components/shared/EmptyScreen`) | Centered empty state with circular icon halo, clear typography, and action buttons. |
| `List` / `ListItem` | `<ListGroup>` / `<ListItem>` (`components/shared/ListGroup`) | Hairline interactive lists with hover transitions and trailing chevron/actions. |
| `BadgeGroup` | `<BadgeGroup>` (`components/shared/BadgeGroup`) | Clusters metadata badges with standard hairline spacing. |
| `FilterSelect` | `<FilterSelect>` (`components/shared/FilterSelect`) | High-density `h-7` dropdown filter trigger. |
| `Pagination` | `<Pagination>` (`components/shared/Pagination`) | Cal.com pagination controls with page count, page selector, and `h-7` buttons. |
| `HorizontalTabs` / `HorizontalTabItem` | `<PageShell tabs={...}>` or `<Page.Tabs>` | Pill-style horizontal tabs with URL synchronization. |
| `Button` (`color="minimal"`) | `<Button variant="minimal">` | Borderless subtle hover button (`h-7` or `icon-sm`). |
| `Button` (`color="primary"`) | `<Button variant="default">` | High-contrast CTA with `shadow-button-solid` (`h-7`). |
| `Button` (`color="secondary"`) | `<Button variant="outline">` | Hairline border `border-border/80` with `shadow-subtle`. |
| `TextField` / `Input` | `<Input>` | High-density `h-7`/`h-8` with subtle hairline border. |
| `FormCard` / `FormCardBody` | `<FormCard>` (`components/shared/FormCard`) | Outer hairline container with interior `divide-y divide-border/50`. |
| `SectionTitle` | `<SectionHeader>` (`components/shared/SectionHeader`) | Typography header with title, subtitle, and action slot. |

---

## 5. Architectural Quality Rules

1. **Strict Dependency Layering:**
   - Features (`client/src/features/*`) import primitives from `@/components/ui`, wrappers from `@/components/shared`, and shell layouts from `@/components/layout`.
   - Never import internal implementation details or CSS files directly from other feature domains.
2. **Anti-Card Boxing Rule:**
   - Settings views must not wrap individual settings in nested `<Card>` components.
   - Use `<FormCard>` or `<Page.SettingGroup>` with `<Page.SettingRow>` separated by hairline dividers (`divide-y divide-border/50`).
3. **No Unstyled HTML:**
   - Raw `<button>`, `<input>`, `<select>`, `<textarea>` elements are strictly forbidden in feature components.
4. **Responsive Integrity:**
   - Headers stack gracefully on mobile screens (`flex-col sm:flex-row sm:items-center sm:justify-between`).
   - Tab bars scroll horizontally with hidden scrollbars (`overflow-x-auto no-scrollbar`).
   - Action slots align to the end on mobile viewports.
