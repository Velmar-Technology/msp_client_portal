# Implementation Plan: Homogeneous Compound Slot Architecture Across All Pages

## Overview
Spread the unified compound slot architecture (`<Page.Header>`, `<Page.HeaderRow>`, `<Page.TitleGroup>`, `<Page.Title>`, `<Page.Description>`, `<Page.Actions maxVisible={...}>`, `<Page.Toolbar>`, and `<Page.Tabs>`) across all 23 remaining pages and views in the portal. This replaces legacy monolithic props (`title`, `subtitle`, `actions`, `tabsSlot`) and deprecated `PageControlPanel` usages with a strictly homogeneous, enterprise-grade, accessible, and responsive layout standard.

## Architecture Decisions
1. **Homogeneous Layout Standard**: Every page implements the identical compound tree:
   - `<Page.Header>`: Top coordinator with optional sticky backdrop glassmorphism.
   - `<Page.Breadcrumbs>`: Clean breadcrumb trail at top of header.
   - `<Page.HeaderRow>`: Flex row aligning identity on left and actions on right.
   - `<Page.TitleGroup>`: Enclosing `<Page.Back>` (where relevant), `<Page.Title>`, status `<Badge>`, and `<Page.Description>`.
   - `<Page.Actions maxVisible={3}>`: Responsive action buttons collapsing into `MoreHorizontal` dropdown when overflowing.
   - `<Page.Toolbar>`: Lays out `<Page.Filters>` (search and filters) and `<Page.Controls>` (pager and view switcher) for data-dense pages.
   - `<Page.Tabs>`: Sub-navigation attached to the bottom of `<Page.Header>` where tabs are present.
2. **Domain-Grouped Vertical Slicing**: Rather than modifying 23 files at once, group migrations into 5 focused slices by domain:
   - Slice 1: Core Data Collection Pages (Devices, CRM, Financial, Maintenance)
   - Slice 2: Operations & Admin Pages (Billing, Users, Plans & PlanEditor, ApiStatus)
   - Slice 3: Dashboard & Detail Pages (AdminDashboard, ClientDashboard, TechDashboard, TicketDetail, CRMCustomPlan)
   - Slice 4: Settings & Configuration Pages (Profile, PasswordManager, NotificationPreferences, ByokSettings)
   - Slice 5: Informational & Static Pages (Resources, Help, StyleGuide, Terms, Privacy, NotFound)
3. **Control Height Uniformity**: All buttons and interactive triggers conform to `h-7` (28px).
4. **Zero Regressions**: Verification checkpoints run after each slice to guarantee clean compilation and 100% test passes.

## Task List

### Phase 8.1: Core Data Collection Pages
- [x] Task 33: Migrate `DevicesPage.tsx` to `<Page.Header>` and `<Page.Actions>`
- [x] Task 34: Migrate `CRMPage.tsx` to `<Page.Header>`, `<Page.Actions>`, and `<Page.Toolbar>`
- [x] Task 35: Migrate `FinancialPage.tsx` from `Page.ControlPanel` to `<Page.Header>` and `<Page.Toolbar>`
- [x] Task 36: Migrate `MaintenancePage.tsx` from `Page.ControlPanel` to `<Page.Header>` and `<Page.Toolbar>`

### Checkpoint: Core Data Pages Green
- [x] Tests pass for modified pages (`DevicesPage`, `CRMPage`, `FinancialPage`, `MaintenancePage`)
- [x] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 8.2: Operations & Admin Pages
- [x] Task 37: Migrate `BillingPage.tsx` to `<Page.Header>` and `<Page.Actions>`
- [x] Task 38: Migrate `UserManagementPage.tsx` to `<Page.Header>` and `<Page.Actions>`
- [x] Task 39: Migrate `PlansPage.tsx` and `PlanEditorPage.tsx` to `<Page.Header>`, `<Page.Back>`, and `<Page.Actions>`
- [x] Task 40: Migrate `ApiStatusPage.tsx` to `<Page.Header>` and `<Page.Actions>`

### Checkpoint: Operations Pages Green
- [x] Tests pass for modified pages (`BillingPage`, `UserManagementPage`, `PlansPage`, `PlanEditorPage`)
- [x] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 8.3: Dashboard & Detail Views
- [x] Task 41: Migrate `AdminDashboardView.tsx`, `ClientDashboardView.tsx`, and `TechDashboardPage.tsx` to `<Page.Header>`
- [x] Task 42: Migrate `TicketDetailPage.tsx` and `CRMCustomPlanPage.tsx` to `<Page.Header>` and `<Page.Back>`

### Checkpoint: Dashboards & Detail Views Green
- [x] Tests pass for modified dashboards and detail views
- [x] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 8.4: Settings & Configuration Pages
- [x] Task 43: Migrate `ProfilePage.tsx` and `PasswordManagerPage.tsx` to `<Page.Header>` and `<Page.Actions>`
- [x] Task 44: Migrate `NotificationPreferencesPage.tsx` and `ByokSettingsPage.tsx` to `<Page.Header>` and `<Page.Tabs>`

### Checkpoint: Settings Pages Green
- [x] Tests pass for settings pages (`PasswordManagerPage`, `NotificationPreferencesPage`, `ByokSettingsPage`)
- [x] Client builds clean with zero type errors (`npm -w client run build`)

### Phase 8.5: Informational, Shared & Legal Pages
- [x] Task 45: Migrate `ResourcesPage.tsx`, `HelpPage.tsx`, and `StyleGuidePage.tsx` to `<Page.Header>`
- [x] Task 46: Migrate `TermsPage.tsx`, `PrivacyPage.tsx`, and `NotFoundPage.tsx` to `<Page.Header>`

### Checkpoint: Final Full System Verification
- [x] Full client test suite passes: `npm -w client run test:run` (50/50 test suites, 329+ tests)
- [x] Client builds clean with zero type errors: `npm -w client run build`
- [x] All pages across the portal share identical layout structure

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Existing test suites might look for specific container test-ids or header element structures | Medium | Verify and update test selectors if any test asserts against specific legacy DOM wrappers. |
| Pages with complex modal state or action triggers | Low | Keep action triggers identical, only wrap them inside `<Page.Actions maxVisible={...}>`. |
| Breadcrumbs duplication on pages with `showBreadcrumbs={false}` | Low | Only render `<Page.Breadcrumbs />` when breadcrumbs were previously enabled. |

## Open Questions
- None. Structure is agreed upon and homogeneous across all views.
