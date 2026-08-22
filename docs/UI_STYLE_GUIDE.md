# UI Style Guide & shadcn/ui Design Standards

## 📌 Architectural Foundation & shadcn/ui Integration

The **MSP Client Portal** frontend follows a strict **4-Level Clean UI Architecture** anchored on **shadcn/ui base primitives (`client/src/components/ui/`)**:

$$\text{Level 1: shadcn/ui Primitives (/components/ui)} \longleftarrow \text{Level 2: Shared Blocks (/components/shared)} \longleftarrow \text{Level 3: Feature Components (/components/[domain])} \longleftarrow \text{Level 4: Views/Pages (/pages, /routes)}$$

### Mandatory Rule for UI Primitives (Level 1)
All buttons, dialogs, dropdowns, inputs, sheets, tables, skeletons, cards, and badges **MUST utilize the shadcn/ui primitives from `@/components/ui/`**. Ad-hoc raw HTML elements (`<button>`, `<input>`, unstyled `<div>` modals) are prohibited unless extending a specialized headless hook.

### Reference Pages
* **Financial Reference**: [`client/src/pages/FinancialPage/FinancialPage.tsx`](file:///c:/Users/support/Workspace/msp_client_portal/client/src/pages/FinancialPage/FinancialPage.tsx)
* **CRM Reference**: [`client/src/pages/CRMPage/CRMPage.tsx`](file:///c:/Users/support/Workspace/msp_client_portal/client/src/pages/CRMPage/CRMPage.tsx)

---

## 🎨 Design Tokens & Palette Specifications

The design system builds upon Tailwind `zinc` surfaces, crisp typography, and high information density:

### Color Surfaces & Borders

| Element | Light Mode | Dark Mode | Notes |
| :--- | :--- | :--- | :--- |
| **Card / Panel Background** | `bg-white` | `dark:bg-zinc-950` | Primary container surface |
| **Muted Card Surface** | `bg-zinc-50` / `bg-zinc-50/50` | `dark:bg-zinc-900/40` | Secondary / nested panels |
| **Primary Border** | `border-zinc-200` | `dark:border-zinc-800` | Outer card & table borders |
| **Subtle Divider / Inner Border**| `border-zinc-100` | `dark:border-zinc-900` | Table headers & row dividers |
| **Hover Border Highlight** | `hover:border-zinc-300` | `dark:hover:border-zinc-700` | Card & button hover states |
| **Primary Text** | `text-zinc-900` | `dark:text-zinc-50` / `dark:text-zinc-100` | Headings and primary values |
| **Secondary / Muted Text** | `text-zinc-500` / `text-zinc-400` | `dark:text-zinc-400` / `dark:text-zinc-500` | Subtitles, labels, timestamps |

---

## 📐 Layout & Action Toolbar Standards

### 1. Page Actions (shadcn/ui `Button` & `Select` Primitives)

Every page uses `<Page title={...} subtitle={...} actions={...}>`. All action controls adhere to a compact `h-7` standard:

* **Control Height**: Strictly `h-7` (28px height).
* **Font Size**: `text-xs font-medium` or `text-xs font-semibold`.
* **Icon Size**: `h-3 w-3` or `h-3.5 w-3.5` with `text-zinc-500 dark:text-zinc-400`.

#### Segmented View Switcher (Composing shadcn `Button` Primitives)
```tsx
import { Button } from "@/components/ui/button";
import { LayoutList, Kanban } from "lucide-react";

<div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
  <Button
    type="button"
    size="sm"
    variant={currentView === "table" ? "secondary" : "ghost"}
    onClick={() => setView("table")}
    className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
  >
    <LayoutList className="h-3.5 w-3.5" />
    <span>{t("crm.views.table")}</span>
  </Button>
  <Button
    type="button"
    size="sm"
    variant={currentView === "kanban" ? "secondary" : "ghost"}
    onClick={() => setView("kanban")}
    className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
  >
    <Kanban className="h-3.5 w-3.5" />
    <span>{t("crm.views.kanban")}</span>
  </Button>
</div>
```

#### Primary & Outline Action Buttons (`@/components/ui/button`)
```tsx
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";

{/* Primary Action */}
<Button
  type="button"
  size="sm"
  onClick={() => openCreateModal()}
  className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
>
  <Plus className="h-3.5 w-3.5" />
  <span>{t("crm.newLead")}</span>
</Button>

{/* Outline Action */}
<Button
  variant="outline"
  size="sm"
  onClick={handleExport}
  disabled={isExporting}
  className="h-7 flex items-center gap-1 px-3 text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-300 dark:hover:text-zinc-100"
>
  <Download className={`h-3 w-3 text-zinc-500 dark:text-zinc-400 ${isExporting ? "animate-spin" : ""}`} />
  <span>{isExporting ? t("common.exporting") : t("common.export")}</span>
</Button>
```

---

### 2. Main Page Layout & Sectioning

The body of the page must be organized into semantic `<section>` blocks with `flex flex-col gap-4`:

```tsx
<Page title={t("page.title")} subtitle={t("page.subtitle")} actions={...}>
  <div className="flex flex-col gap-4">
    {/* 1. Metric Summary Cards */}
    <section aria-label="KPI Metrics">
      <KpiCards kpis={kpis} />
    </section>

    {/* 2. Interactive Analytical Views / Charts */}
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Analytical Views">
      ...
    </section>

    {/* 3. Primary Data View (DataTable / Kanban) */}
    <section aria-label="Main Data Table">
      ...
    </section>
  </div>
</Page>
```

---

## 📊 Component Pattern Specifications

### 1. KPI Summary Metric Cards

* **Grid Definition**: `grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`
* **Card Container**: `group rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700`
* **Header Label**: `text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`
* **Icon Box**: `rounded-md bg-zinc-50 p-1.5 text-zinc-600 transition-colors group-hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-400 dark:group-hover:bg-zinc-900` with `h-3.5 w-3.5` icon
* **Metric Value**: `text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50`
* **Trend Badge**:
  * Positive: `inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400`
  * Negative: `inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400`
* **Secondary Sub-label**: `mt-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono`

```tsx
<div className="group rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
      {t("crm.stats.pipelineValue")}
    </span>
    <div className="rounded-md bg-zinc-50 p-1.5 text-zinc-600 transition-colors group-hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-400 dark:group-hover:bg-zinc-900">
      <DollarSign className="h-3.5 w-3.5" />
    </div>
  </div>
  <div className="mt-2.5 flex items-baseline justify-between">
    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
      ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </h2>
  </div>
  <p className="mt-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
    {count} {t("crm.totalLeads")}
  </p>
</div>
```

---

### 2. Status & Stage Indicators (Pill Pattern)

For workflow states, tickets, transactions, and CRM leads:

* **Badge Structure**: `inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium`
* **Dot Indicator**: `<span className="mr-1 h-1 w-1 rounded-full ${dotColor}" />`

| Stage / Status | Badge Classes | Dot Class |
| :--- | :--- | :--- |
| **Paid / Won / Active** | `bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20` | `bg-emerald-500` |
| **Pending / Proposition** | `bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20` | `bg-amber-500` |
| **Failed / High / Overdue** | `bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-500/20` | `bg-red-500` |
| **New / Qualified / Info** | `bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20` | `bg-blue-500` |
| **Neutral / Lost / Inactive** | `bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700` | `bg-zinc-400` |

```tsx
<span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
  <span className="mr-1 h-1 w-1 rounded-full bg-emerald-500" />
  {t("status.paid")}
</span>
```

---

### 3. Data Tables & Lists (`@/components/ui/data-table` & `@/components/ui/table`)

* **Wrapper Card**: `rounded-lg border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950`
* **Table Header (`<thead>`)**: `border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-900 dark:bg-zinc-900/10 px-3.5 py-2`
* **Table Body Rows (`<tbody>`)**: `divide-y divide-zinc-100 dark:divide-zinc-900` with `hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 px-3.5 py-2`
* **Pagination Bar**: `flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/10 px-3.5 pb-2.5 rounded-b-lg` using shadcn ghost `Button` primitives.

---

### 4. Overlays & Drawers (shadcn `Sheet`, `Dialog`, `AlertDialog`)

* **Lead / Detail Drawers**: Use `@/components/ui/sheet` (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`).
* **Creation Modals**: Use `@/components/ui/dialog` (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`).
* **Destructive Confirmations**: Use `@/components/ui/alert-dialog` (`AlertDialog`, `AlertDialogContent`, `AlertDialogAction` with `bg-destructive hover:bg-destructive/90 text-white`).
* **Row Context Actions**: Use `@/components/ui/dropdown-menu` (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`).

---

### 5. Skeleton Placeholders (`@/components/ui/skeleton`)

For loading states, use `@/components/ui/skeleton` configured to match the card structure:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeletonPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between ${className || "h-72"}`}>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}
```
