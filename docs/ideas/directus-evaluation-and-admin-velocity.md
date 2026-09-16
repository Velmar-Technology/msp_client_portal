# Idea Refine: Directus Architectural Evaluation & The Contract-Driven Admin Velocity Engine

## Problem Statement
**How might we** empower MSP technicians and administrators with a fast, zero-boilerplate back-office data management interface without introducing external CMS runtime bloat, polluting our Drizzle PostgreSQL schema, or bypassing our 18 Master Business Logic invariants (BL-101 to BL-802)?

---

## Recommended Direction: Reject Directus; Build the "Contract-Driven Admin Engine"
Rather than adopting Directus (which writes raw SQL and bypasses domain rules), build a declarative, contract-driven back-office view engine inside the existing React 19 + Express 5 monorepo:

1. **Declarative UI Scaffold (`<AdminDataTable />`):**
   A reusable component combining TanStack Table v8, `shadcn/ui` table primitives, and auto-generated filter/search bars derived directly from `@shared/contracts` Zod definitions.
2. **Unified Base Admin Gateway:**
   Standardized REST endpoints for back-office list/filter/pagination that route through domain services, ensuring multi-tenant isolation, Zanzibar ReBAC checks, and full event logging.
3. **Developer Velocity Parity:**
   Adding a full management table for any new entity (e.g., `audit_logs`, `expenses`, `quotations`, `leads`) takes **< 40 lines of declarative TypeScript**, achieving the exact velocity benefit of a headless CMS without the structural liabilities.

---

## Key Assumptions to Validate
- [ ] **Velocity Validation:** Verify that a standardized `<AdminDataTable />` can instantiate a fully functional, paginated, searchable admin view for a new domain in under 30 minutes.
- [ ] **Invariant Safety:** Confirm that 100% of mutations executed through the back-office views pass through `BaseService` / Domain Services and trigger audit logging (`ticket_events`, OpEx calculations, emails).
- [ ] **Developer Ergonomics:** Validate that `npx drizzle-kit studio` completely covers ad-hoc engineering database debugging, eliminating any remaining desire for a third-party DB browser.

---

## MVP Scope

### What's In:
- Create `<AdminDataTable<T> />` in `client/src/components/shared/AdminDataTable.tsx` with sorting, debounce search, pagination, and multi-tenant scoping.
- Implement an automated filter generator that renders typed dropdowns from Zod enum contracts.
- Add an `npx drizzle-kit studio` script helper in `server/package.json` (`npm -w server run db:studio`) for direct developer database inspection.
- Pilot the engine on an entity requiring rapid technician oversight (e.g. `Expenses & Commission Ledger` or `Audit Events`).

### What's Out (Not Doing & Why):
- **NOT installing Directus, Strapi, or any headless CMS:** Bypasses business invariants, pollutes schemas with metadata tables, and breaks Zanzibar authorization.
- **NOT building ad-hoc custom tables for every future back-office entity:** Defeats the velocity goal; the declarative table primitive must handle standard CRUD layouts.
- **NOT exposing direct SQL write access to technicians:** All mutations must hit domain services to preserve ledger and state-machine integrity.

---

## Open Questions
1. Which entity would you like to pilot this declarative Admin Engine on first (e.g., OpEx & Technician Commissions, CRM Leads, or System Audit Logs)?
2. Do you have a requirement for non-technical users to edit rich marketing/public content, or is this strictly operational data management?
