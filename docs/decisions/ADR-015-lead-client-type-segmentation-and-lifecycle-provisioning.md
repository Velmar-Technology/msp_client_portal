# ADR-015: Lead Client Type Segmentation and Automated Lifecycle Provisioning

## Status
Accepted

## Date
2026-10-06

## Context

In the MSP CRM module, leads progress through deal stages (`NEW` $\rightarrow$ `QUALIFIED` $\rightarrow$ `PROPOSAL` $\rightarrow$ `NEGOTIATION` $\rightarrow$ `WON`/`LOST`). However:
1. **Lack of Early Segmentation**: The `leads` table only tracked contact information, deal value, and status, with no categorization of the customer segment (`client_type`: `CLIENT`, `ENTERPRISE`, `STUDENT`, `OTHER`).
2. **Disconnected Deal Conversion**: When a sales opportunity was won and converted into a customer subscription via `CRMService.convertLeadToDeal`, the newly created user account defaulted to a generic client type, requiring manual administrative remediation to classify the account.
3. **Specialized Academic & Educational Outreach**: With the launch of the **Education & Faculty Suite** (`PL-005`), dozens of educator prospects were imported into the CRM. Without an explicit `client_type` attribute, pipeline views could not filter or visually distinguish academic leads from enterprise or standard clients.

### Requirements
- **First-Class Lead Classification**: Explicit `client_type` attribute on `leads` with enum constraints (`'CLIENT'`, `'ENTERPRISE'`, `'STUDENT'`, `'OTHER'`) and database indexing for fast filtering.
- **Intelligent Pre-Selection**: The CRM creation modal should auto-default `client_type` when an administrator or sales engineer selects a plan (e.g., selecting `PL-005 Education & Faculty Suite` sets `client_type = 'STUDENT'`).
- **Editable in Pipeline Sheets**: Sales staff must be able to inspect and reclassify lead types throughout the sales cycle directly from the lead detail sheet.
- **Zero-Friction Conversion**: When converting a lead to a deal, the newly provisioned user account must automatically inherit the lead's segmented `client_type`.
- **Automatic Backfill**: Existing leads bound to plans with specified client types must inherit their classification with zero manual data re-entry.

---

## Decision

We introduced first-class **Lead Client Type Segmentation** spanning the relational schema, DTO contracts, repository layer, domain services, and the React CRM frontend.

### 1. Database Schema & Automatic Backfill (Migration `049`)

```sql
-- Migration 049: Add client_type to leads table for CRM prospect classification
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'CLIENT' NOT NULL;

-- Automatic backfill from associated catalog plan
UPDATE leads l
SET client_type = p.client_type
FROM plans p
WHERE l.plan_id = p.id AND p.client_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_type ON leads(client_type);
```

* **Default Value**: Defaults to `'CLIENT'` to preserve full backwards compatibility for unclassified leads.
* **Indexed Filter**: The `idx_leads_client_type` index enables sub-millisecond query filtering across large prospect lists.
* **Plan Backfill**: In production, all 74 educator leads associated with `PL-005` were automatically populated with `client_type = 'STUDENT'`.

### 2. Contract & DTO Enforcement (`crm.dto.ts`)

All CRM input schemas enforce valid segmentation:
```typescript
export const CreateLeadDTO = z.object({
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  clientType: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER']).default('CLIENT'),
  planId: z.string().optional(),
  // ...
});

export const UpdateLeadDTO = CreateLeadDTO.partial();

export const GetLeadsQueryDTO = z.object({
  status: z.enum(LeadStatusValues).optional(),
  clientType: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER']).optional(),
  search: z.string().optional(),
});
```

### 3. Automated Lifecycle Deal Conversion (`CRMService`)

When an opportunity is marked `WON` and converted via `convertLeadToDeal`:
```typescript
// server/src/modules/crm/services/CRMService.ts
const createdUser = await this.userRepo.createUser({
  email: lead.contact_email,
  name: lead.contact_name,
  passwordHash: tempPasswordHash,
  role: UserRole.CLIENT,
  clientType: lead.client_type || 'CLIENT', // Propagates segmented classification
  tenantId: lead.tenant_id,
});
```
The client user account is provisioned with their correct segment, granting immediate role-appropriate entitlements and dashboard configurations upon first login.

### 4. Interactive Frontend Experience (`client/src/features/crm/`)

* **+ New Lead Modal (`CRMNewLeadModal.tsx`)**:
  - Displays a dedicated `Client Type` select dropdown with clear localized labels.
  - Automatically updates `clientType` to match the selected plan's target segment whenever `planId` changes.
* **Lead Detail Sheet (`CRMLeadDetailSheet.tsx`)**:
  - **Read Mode**: Color-coded badges distinguish segments (`STUDENT` in purple, `ENTERPRISE` in blue, `CLIENT` in slate).
  - **Edit Mode**: Dropdown selector allows instantaneous reclassification with automatic cache invalidation via TanStack Query.
* **Table & Kanban Views (`CRMDataTable.tsx`, `CRMKanbanBoard.tsx`)**:
  - Visual badges render on every row and card for rapid pipeline scanning.

---

## Alternatives Considered

1. **Tag-Based Segmentation (Generic String Tags Array)**:
   - Rejected: Free-form tags lead to typographic errors (e.g., `student` vs `Student` vs `educator`) and lack strict database constraints, complicating automated provisioning logic.
2. **Inferring Client Type Exclusively from Plan**:
   - Rejected: Not all leads have an assigned plan during early stages (`NEW` or `QUALIFIED`). The prospect type must be known before a specific service plan is proposed.
3. **Manual Reclassification After Deal Conversion**:
   - Rejected: Creates operational lag and risks sending inappropriate onboarding communications to academic or corporate users.

---

## Consequences

- **Operational Clarity**: Sales and support staff have immediate visual clarity over lead demographics across the entire CRM pipeline.
- **Automated Workflows**: Eliminates manual user reclassification upon conversion.
- **Targeted Analytics**: Enables future reporting on conversion rates, lifetime value (LTV), and pipeline velocity segmented by client type.
