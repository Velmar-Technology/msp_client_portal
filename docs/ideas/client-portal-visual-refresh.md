# Visual Refresh & Design-System Enforcement for the Client Portal

## Problem Statement
> How might we make the client portal feel premium and cohesive — instead of cheap and inconsistent — for prospects evaluating our MSP, while making the design rules self-enforcing so they never regress?

**Presenting symptom:** hardcoded `zinc/white` classes bypass semantic tokens (`bg-white dark:bg-zinc-950` vs `bg-card`), raw `<button>`/`<input>`/`<textarea>` bypass shadcn primitives, and radii/spacing drift — across `BillingPage`, `CRMCustomPlanPage`, `ApiStatusPage`, `RecentInvoices`, `ActiveSubscriptions`, `CheckoutSheet`, `TicketResponses`, `PaymentFields`, `GoogleLoginButton`, and more.

## Recommended Direction
**Fused: (1) Lift the visual language, (2) encode it in scarce composed components, (3) lock it in with lint + a live style-guide.** Ship fast proof-of-value on dark-mode first, then sweep the highest-traffic client-facing pages before internal/admin ones. Not a ground-up redesign — your `radix-mira` primitives are already well-built; the win is enforcement + cohesion.

## Key Assumptions to Validate
- [ ] Dark-mode fix reads "premium" fast and gives momentum (demo-able)
- [ ] Composed components cut drift (measure `zinc-`/raw-button counts after 3 pages)
- [ ] Lint guardrails stay in place (watch for eslint-disable sprawl)
- [ ] Class-based tests don't break — extensive RTL coverage asserts roles/text, not classNames

## MVP Scope
1. **Guardrails first:** eslint `no-restricted-syntax` banning raw `zinc-*`/`white` colors + raw buttons/inputs
2. **Composed components (`components/shared`):** `PageHeader`, `StatCard`/`DataCard`, `EmptyState`, `ModalFooter`, table toolbar
3. **Dark-mode hardening pass** on Dashboard, Tickets, Billing
4. **Live style-guide page** rendered from real components (kills "unknown conventions")
5. **Visual lift on top 4 client-facing pages** using tokens + new components

## Not Doing (and Why)
- Full 100+ file sweep in one pass — scope creep / never ships
- Closed components forbidding all className overrides — fights Tailwind, fragile
- Wholesale style change — your compact `radix-mira` system is fine; the problem is inconsistent application
- New button/input primitives — they exist and are good
- i18n/behavior changes — visuals only

## Open Questions
- Top-4 client-facing priority order? (Guess: Billing, Tickets, Dashboard, Devices)
- Style-guide: developer-only route or visible page?
- OK to land eslint rule at `warn` level leaving existing offenders as backlog?
