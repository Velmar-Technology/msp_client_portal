# Implementation Plan: Odoo-Style View System for Page Component

## Overview
Transform `client/src/components/Page.tsx` into an extensible, Odoo-inspired View System with a Unified Control Panel (`<Page.ControlPanel>`), View Switcher (`<Page.ViewSwitcher>`), Faceted Search Bar (`<Page.Search>`), Compact Pager (`<Page.Pager>`), and conditional multi-mode views (`<Page.View type="...">`), backed by a headless `PageContext` synced to `useUrlState`. Maintains 100% backward compatibility for all existing usages across the MSP portal.

## Architecture Decisions
1. **Compound Component API**: Retain `<Page>` as the main wrapper, attaching sub-components (`Page.ControlPanel`, `Page.ViewSwitcher`, `Page.Search`, `Page.Pager`, `Page.View`, `Page.StatusBar`).
2. **Backward Compatibility Guarantee**: All existing `PageProps` (`title`, `subtitle`, `actions`, `showBreadcrumbs`, `isLoading`, `children`) continue to work untouched. Existing pages do not break.
3. **Headless State & URL Sync**: `PageContext` encapsulates the active view mode (e.g. `list`, `kanban`, `form`), search query, and pagination state. When `syncUrl={true}` (default), it reads and updates query params via `useUrlState` without collisions (`?view=`, `?search=`, `?page=`).
4. **Design System & Controls Compliance**: All controls strictly adhere to AGENTS.md compact standard `h-7` (28px height), Radix UI primitives (`@/components/ui/button`, `@/components/ui/input`, `@/components/ui/badge`), and full i18n localization support.
5. **No Duplicate Types**: Type definitions strictly typed in TypeScript, no `@ts-ignore` or `eslint-disable`.

## Task List

### Phase 1: Foundation & Core State Architecture
- [ ] Task 1: Create `PageContext` and headless view controller hook (`usePageView`) with URL synchronization
- [ ] Task 2: Implement compound sub-components (`PageControlPanel`, `PageViewSwitcher`, `PageSearch`, `PagePager`, `PageView`)
- [ ] Task 3: Assemble compound `<Page>` component with full backward-compatibility and export tree

### Checkpoint: Foundation & Component Unit Tests
- [ ] Unit test suite passes for `Page` compound components (`Page.test.tsx`)
- [ ] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 2: Pilot Domain Adoption & Refinement
- [ ] Task 4: Pilot adoption on `TicketsPage.tsx` or `CRMPage.tsx` demonstrating seamless List / Kanban switching and unified ControlPanel
- [ ] Task 5: Document component usage recipe in `client/src/components/page/README.md` and feature slice docs

### Checkpoint: Verification & Acceptance
- [ ] All client tests pass (`npm -w client run test:run`)
- [ ] Client typecheck passes (`npm -w client run build`)
- [ ] Verify zero regressions on existing pages using simple `<Page>`

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Breaking existing 20+ pages using `<Page>` | High | Preserve `PageProps` signature exactly. Wrap children in default view context if no custom compound slots are used. |
| URL state collision with domain-specific query params | Medium | Allow configuring custom URL param keys (`viewParamKey`, `searchParamKey`, `pageParamKey`) via props with sensible defaults. |
| Re-render performance on search typing | Low | Built-in debounce (300ms) on `PageSearch` with immediate local input state. |

## Open Questions
- None blocking; Direction A approved by user. Optional `Page.StatusBar` slot included for future detail page alignment.
