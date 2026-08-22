# UI Styling Standards & shadcn/ui Design Rules

## 1. Mandatory Level 1 Primitive Rule
All interactive elements, forms, and overlays **MUST strictly use shadcn/ui primitives from `client/src/components/ui/`**:
- **Buttons & Controls**: `import { Button } from "@/components/ui/button"`
- **Inputs & Form Controls**: `import { Input } from "@/components/ui/input"`
- **Selects & Dropdowns**: `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"`
- **Checkboxes**: `import { Checkbox } from "@/components/ui/checkbox"`
- **Tables**: `import { DataTable } from "@/components/ui/data-table"` or `import { Table, TableBody, ... } from "@/components/ui/table"`
- **Drawers & Sheets**: `import { Sheet, SheetContent, ... } from "@/components/ui/sheet"`
- **Modals & Dialogs**: `import { Dialog, DialogContent, ... } from "@/components/ui/dialog"`
- **Confirmations**: `import { AlertDialog, AlertDialogAction, ... } from "@/components/ui/alert-dialog"`
- **Dropdown Menus**: `import { DropdownMenu, DropdownMenuItem, ... } from "@/components/ui/dropdown-menu"`
- **Skeletons**: `import { Skeleton } from "@/components/ui/skeleton"`
- **Badges**: `import { Badge } from "@/components/ui/badge"`

Raw HTML elements (`<button>`, unstyled `<select>`, raw `<input>`, raw `<dialog>`) are strictly forbidden.

---

## 2. Synchronized Control Height Standards (`h-7` Baseline)
To eliminate height discrepancies across toolbars, forms, data tables, modals, and sheets, all input and action primitives support synchronized size variants:

| Variant (`size`) | Pixel Height | Tailwind Class | Typography / Padding | Typical Use Case |
| :--- | :---: | :---: | :---: | :--- |
| **`xs`** | 20px | `h-5` | `text-[0.625rem] px-1.5 py-0` | Micro table row actions, compact pills, sub-parameters |
| **`sm`** | 24px | `h-6` | `text-xs px-2 py-0.5` | Dense dialogs, nested tabs, compact table cells |
| **`default`** | 28px | `h-7` | `text-xs px-2 py-1` | **App-wide default**: toolbars, search bars, modals, settings |
| **`lg`** | 32px | `h-8` | `text-xs px-2.5 py-1.5` | Hero search inputs, prominent CTA buttons |

### Zero Ad-Hoc Height Overrides Rule
Never hardcode arbitrary height classes (e.g. `h-8.5`, `h-9`, `h-10`, `py-3`) on `Input`, `SelectTrigger`, or `Button` instances. Rely directly on the component's default (`h-7`) or explicit `size` prop (`size="sm" | "default" | "lg" | "xs"`) to maintain strict visual parity.

- **Standard Toolbar & Search Height**: Strictly `h-7` (28px height).
- **Font Size**: `text-xs font-medium` or `text-xs font-semibold`.
- **Segmented View Switchers**: `bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800` composing `Button` primitives.
- **Icons in Controls**: `h-3 w-3` or `h-3.5 w-3.5` with `text-zinc-500 dark:text-zinc-400`.

---

## 3. KPI Summary Metric Cards
- Outer Card: `group rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700`.
- Label: `text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`.
- Icon Box: `rounded-md bg-zinc-50 p-1.5 text-zinc-600 transition-colors group-hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-400 dark:group-hover:bg-zinc-900`.
- Value: `text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50`.
- Monospace subtext: `mt-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono`.

---

## 4. Status Badges & Dot Indicators
- Pattern: `inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium` with a 4px dot `<span className="mr-1 h-1 w-1 rounded-full ${dotClass}" />`.
- States:
  - Paid/Won/Active: `bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20` (dot: `bg-emerald-500`)
  - Pending/Proposition: `bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20` (dot: `bg-amber-500`)
  - Danger/High/Failed: `bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-500/20` (dot: `bg-red-500`)
  - Info/New/Qualified: `bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20` (dot: `bg-blue-500`)
  - Neutral/Lost: `bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700` (dot: `bg-zinc-400`)

---

## 5. Page Spacing & Section Architecture
- Body wrapper: `<div className="flex flex-col gap-4">`.
- Sections: Wrap all main subsections with accessible `<section aria-label="...">` blocks.
