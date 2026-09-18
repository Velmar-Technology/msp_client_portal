# Implementation Plan: Unified Compound Slot Architecture for `<Page />`

## Overview
Transform `client/src/components/Page.tsx` by replacing monolithic header props (`title`, `subtitle`, `actions`, `tabsSlot`) and separate `PageControlPanel` with a composable, strict compound slot system (`Page.Header`, `Page.Actions`, `Page.Toolbar`, `Page.Tabs`). It natively handles responsive action overflow with `maxVisible`, sticky glassmorphism headers (`sticky top-0 z-20 backdrop-blur-md bg-background/85`), and unifies layout across all portal views while retaining 100% backward compatibility for legacy pages.

## Architecture Decisions
1. **Strict Compound Slots**: Introduce `<Page.Header>` as the primary layout coordinator for page tops, containing `<Page.HeaderRow>`, `<Page.TitleGroup>`, `<Page.Title>`, `<Page.Description>`, `<Page.Actions>`, `<Page.Toolbar>`, and `<Page.Tabs>`.
2. **Sticky Glassmorphism**: `<Page.Header sticky>` adds `sticky top-0 z-20 backdrop-blur-md bg-background/85 transition-all` with a subtle bottom border shadow, ensuring action buttons and tab navigation stay accessible without breaking page scrolling.
3. **Responsive Action Overflow**: `<Page.Actions maxVisible={n}>` automatically slices actions beyond `n` into a compact `MoreHorizontal` dropdown menu (`DropdownMenu`), preserving click handlers, tooltips, and disabled states.
4. **ControlPanel Unification**: Merge `PageControlPanel` capabilities directly into `<Page.Toolbar>` (`Page.Search`, `Page.Filters`, `Page.Controls` with `Page.Pager` and `Page.ViewSwitcher`), providing a single layout structure for both data-dense CRUD lists and standard pages.
5. **Non-Breaking Backward Compatibility**: Maintain existing `PageProps` (`title`, `subtitle`, `actions`, `tabs`, `tabsSlot`) in `PageRoot` using an internal adapter with `@deprecated` notices so no existing pages break.
6. **Design System & Heights Standard**: All buttons, inputs, and dropdown triggers strictly adhere to the `h-7` (28px) standard from `AGENTS.md` and `CONSTRAINTS.md`.

## Task List

### Phase 7: Unified Compound Slot Architecture for Page
- [ ] Task 25: Define TypeScript interfaces and contracts for `PageHeader` slot components in `client/src/components/page/types.ts`
- [ ] Task 26: Implement `PageHeader`, `PageHeaderRow`, `PageTitleGroup`, `PageTitle`, `PageDescription`, and `PageBack` in `client/src/components/page/PageHeader.tsx`
- [ ] Task 27: Implement responsive `PageActions` with `maxVisible` overflow dropdown in `client/src/components/page/PageHeader.tsx`
- [ ] Task 28: Implement `PageToolbar`, `PageFilters`, and `PageControls` in `client/src/components/page/PageHeader.tsx`

### Checkpoint: Slot Primitives Implemented
- [ ] TypeScript compilation passes cleanly (`npm -w client run build`)

### Phase 7.2: Assembly, Backward Compatibility & Testing
- [ ] Task 29: Assemble compound components in `client/src/components/Page.tsx`, export via `client/src/components/page/index.ts`, and adapt legacy props
- [ ] Task 30: Create comprehensive unit tests in `client/src/components/page/PageHeader.test.tsx` verifying sticky styling, action overflow, and compound composition
- [ ] Task 31: Pilot adoption on `client/src/features/tickets/pages/TicketsPage.tsx` using new `<Page.Header>`, `<Page.Actions maxVisible={...}>`, and `<Page.Toolbar>`
- [ ] Task 32: Update design system documentation in `client/src/components/page/README.md`

### Checkpoint: Verification & Acceptance
- [ ] All client tests pass (`npm -w client run test:run`)
- [ ] Client builds clean with zero type errors (`npm -w client run build`)
- [ ] Zero regressions across existing portal pages

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Action child elements inside `PageActions` may have varied structures (e.g. `TooltipTrigger`, fragments, conditional falsy values) | Medium | Filter children with `React.Children.toArray` and filter out falsy/null items before applying `slice` and wrapping in dropdown menu items. |
| Sticky header z-index collision with modals, sheet drawers, or tooltips | Medium | Use standard `z-20` for sticky headers (well below dialog/modal `z-50` and popover `z-40`). |
| Existing 40+ pages regressing due to changes in `PageRoot` | High | Wrap legacy props in an internal adapter that renders the existing layout markup verbatim when legacy props are present. |

## Open Questions
- None. User confirmed sticky glassmorphism support, strict compound architecture, and responsive action overflow.
