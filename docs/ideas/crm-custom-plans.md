# CRM Bespoke Custom Plans & Client Assignment Studio

## Problem Statement
How might we empower sales admins in the CRM to craft private, tailored subscription plans (with custom base rates, per-device rates, SLA response guarantees, ticket quotas, and tax exemptions) and bind them to specific Leads or Clients upon deal closing?

## Recommended Direction
Introduce a **"Custom Plans" Studio Sheet & Modal** accessible from [CRMPage.tsx](file:///c:/Users/PC/Workspace/msp_client_portal/client/src/pages/CRMPage/CRMPage.tsx) and the Lead Detail drawer:
1. **Dedicated CRM Action:** A "Custom Plan Studio" button in the CRM toolbar and Lead Detail Sheet (`CRMCustomPlanModal`).
2. **Private Plan Entity:** Generates a custom plan entry tagged `is_custom: true`, `tenant_id`, and `lead_id`/`client_id` (filtered out from public customer-facing pricing tables).
3. **Configurable Parameters:**
   - **Financials:** Custom base price, per-device rate ($M_{\text{equip}}$), currency (`USD`/`DOP`), and DGII ITBIS tax exemption flag.
   - **Service Level Agreement (SLA):** Priority response time multipliers (P1 Critical: 15m/10m, P2 High: 30m/1h, etc.).
   - **Usage Quotas:** Custom monthly ticket quota per device (or unlimited).
   - **Billing Term:** Monthly, Quarterly, or Annual renewal cycles.
4. **Lead & Subscription Binding:** Automatically binds the custom plan ID to the Lead during the `PROPOSITION` / `NEGOTIATION` stage and creates the matching active subscription + NCF invoice when transitioned to `WON` via `convertLeadToSubscription()`.

## Key Assumptions to Validate
- [ ] **Quota Enforcement:** Ensure `ticketQuotaService.enforceTicketLimit` checks custom plan quotas if `is_custom` is active.
- [ ] **Invoice Engine Compatibility:** Validate that `invoiceRepository.create` properly multiplies `(base_price + (equipment_count * per_device_rate))` for custom plans.
- [ ] **Catalog Isolation:** Confirm the public registration/pricing page strictly queries `where(eq(plans.active, true), eq(plans.is_custom, false))`.

## MVP Scope
- **UI:**
  - `CRMCustomPlanModal.tsx` in `client/src/pages/CRMPage/components/` with validation via Zod + React Hook Form.
  - "Apply to Lead" dropdown selector inside the modal or inline trigger from `CRMLeadDetailSheet`.
  - Custom Plan badge and summary breakdown inside the Lead Detail view.
- **Backend / Services:**
  - `POST /api/v1/crm/custom-plans` endpoint to validate and create tenant-isolated custom plans.
  - Integration with `crmService.sendQuotation` and `crmService.convertLeadToSubscription`.
  - Database schema extension: `is_custom: boolean`, `per_device_price: integer`, `sla_tier: jsonb`, `ticket_quota: integer`.

## Not Doing (and Why)
- **Public Self-Service Plan Builder:** Clients will not design their own plans online without sales rep review; all custom plans must originate from authorized CRM operators.
- **Dynamic Recurring PayPal Billing Plans for Custom Tiers:** We will use standard captured invoices (`invoices` table + DGII NCF) rather than spawning dozens of single-use PayPal Catalog Product IDs.
- **Multi-tenant Plan Leaking:** Custom plans created in Tenant A will never be visible or assignable in Tenant B.

## Open Questions
- Should custom plans automatically expire if the associated Lead is moved to `LOST`?
- Do you want a dedicated "Clone from Standard Plan" shortcut inside the modal to speed up creation?
