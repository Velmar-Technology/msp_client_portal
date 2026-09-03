# Concept: BL-702 Graceful Non-Payment Handling for Password Vaults

## Status
Approved for Implementation

## Date
2026-09-03

---

## 1. Problem Statement
Under the canonical 4-tier non-payment scale (`BL-702`), delinquent tenant accounts advance through progressive enforcement:
- **Day 1:** Overdue notice.
- **Day 5:** `READ_ONLY` mode (write mutations blocked).
- **Day 15:** `SUSPENDED` mode (platform & support access halted).
- **Day 30:** `PURGED` mode (permanent technical deletion for storage liberation).

When applied bluntly to password management (Vaultwarden), a total lockout at **Day 15** introduces a catastrophic **Hostage Catch-22**:
1. **Inability to Settle Payments:** The client's corporate banking, credit card, and PayPal credentials may be stored inside the locked vault. Cutting off access halts their ability to settle overdue invoices.
2. **Operational Paralysis:** Front-desk workstations, critical production tools, and employee systems immediately fail, converting a commercial collections dispute into an adversarial business shutdown.
3. **Day 30 Irreversible Deletion Liability:** Deleting customer password databases permanently carries severe brand, regulatory, and legal liability compared to liberating simple file storage.

---

## 2. Recommended Direction: Progressive "Vault Frozen in Time" + Emergency Grace

We implement a specialized, graceful password vault lifecycle under `BL-702` that maximizes collection pressure without paralyzing client payment operations:

### Tier 1 — Day 5: Vault Read-Only Freeze (`READ_ONLY`)
- **Autofill & Retrieval Active:** Workers and machine slots (`device_<slotId>@tenant.local`) retain 100% search, copy, and browser extension autofill access to existing credentials.
- **Write Mutation Lock:** Organization collections in Vaultwarden are locked (`readOnly: true`). Creating new logins, generating new passwords, inviting new members, and editing existing entries are rejected.
- **In-App Warning:** Persistent amber notice on `/password-manager` and `/billing`: *"Vault is in Read-Only Mode due to unpaid balance. Settle invoice to unlock credential modifications."*

### Tier 2 — Day 15: Captive Billing Gateway & Emergency Grace (`SUSPENDED`)
- **Web Vault Captive Gateway:** Attempting to access the Web Vault (`/vault/`) or portal `/password-manager` redirects to a captive billing settlement view (`/billing?lockout=true`).
- **Endpoint Autofill Continuity:** Pre-authenticated browser extensions continue autofilling with local cached credentials to keep point-of-sale and reception desks operational.
- **24-Hour Emergency Grace Extension:** Client Admins can click a self-service **"Request 24h Emergency Access"** button in the portal (limited to 1 use per overdue cycle) to unlock the Web Vault for 24 hours while an offline bank transfer or accounting payment is processed.

### Tier 3 — Day 30: Encrypted Escrow Archive & Tenant Purge (`PURGED`)
- **Encrypted Backup Dispatch:** Prior to deleting the Vaultwarden organization, the backend generates an automated, password-encrypted JSON export of the organization's collections and securely emails it as an attachment to the Client Admin's verified email address.
- **Tenant Vault Liberation:** The live Vaultwarden organization and machine identities are deleted from the server database, liberating storage with zero MSP liability.
- **Audit Logging:** Logs the export generation and purge event with timestamp and tenant ID in the audit log.

---

## 3. Key Assumptions
1. **Vaultwarden API Support:** Vaultwarden exposes API endpoints or collection configuration to toggle `readOnly: true` on organization collections.
2. **Audit Integrity:** Emergency 24-hour grace extensions must be strictly tracked in the database (`tenants.last_grace_extension_at`) to prevent abuse.
3. **Zero-Knowledge Decryption:** The automated export on Day 30 utilizes Vaultwarden's organization export API, encrypted with the organization's encryption key or delivered with administrative zero-knowledge compliance.

---

## 4. MVP Scope

### Phase 1: Database & Backend Services
1. **Schema Extension (`tenants` table):**
   - Add `vault_grace_extension_until: timestamp` and `vault_grace_extensions_count: integer` (default 0).
2. **`VaultwardenService` Extensions:**
   - `setOrganizationReadOnly(orgId: string, readOnly: boolean)`: Updates collection permissions to read-only or read-write.
   - `exportOrganizationEncrypted(orgId: string)`: Generates an encrypted export of the organization vault.
3. **`NonPaymentSuspensionService` Integration:**
   - On **Day 5**: Call `vaultwardenSvc.setOrganizationReadOnly(tenantId, true)`.
   - On **Day 15**: Keep existing user lockout but respect `vault_grace_extension_until > now()`.
   - On **Day 30**: Call `vaultwardenSvc.exportOrganizationEncrypted(tenantId)`, send via email to Client Admin, then call `deleteOrganization(tenantId)`.
4. **Billing API Endpoint:**
   - `POST /api/v1/billing/request-vault-grace`: Validates client role, checks if grace was already used this cycle, and grants a 24-hour extension.

### Phase 2: Frontend Client Portal
1. **Emergency Grace UI:**
   - In `/billing`, display an "Emergency 24h Grace Extension" button if account is in `READ_ONLY` or `SUSPENDED` state and grace has not been utilized.
2. **Banner Notifications:**
   - On `/password-manager`, display clear alerts informing the user of Read-Only status or pending purge countdown.

---

## 5. Not Doing (Out of Scope for MVP)
- **Granular Per-Domain Whitelisting:** Whitelisting only banking domains on extension autofill (too complex; requires custom browser extension code rather than stock Bitwarden).
- **Multiple Consecutive Grace Passes:** Clients cannot chain multiple 24-hour extensions together without admin manual override.
- **Third-Party Escrow Deposits:** Depositing the encrypted vault with external legal escrow services.

---

## 6. Implementation Checklist

- [ ] Add `vault_grace_extension_until` to `tenants` table schema.
- [ ] Implement `setOrganizationReadOnly` in `VaultwardenService`.
- [ ] Implement `exportOrganizationEncrypted` and dispatch email in `NonPaymentSuspensionService`.
- [ ] Add `POST /api/v1/billing/request-vault-grace` endpoint in `billing.routes.ts`.
- [ ] Connect "Request 24h Grace Extension" button in client billing UI.
- [ ] Add bilingual translation strings (`en_US.json` and `es_DO.json`).
- [ ] Write Vitest test suite verifying Day 5 read-only, Day 15 grace extension, and Day 30 export-before-purge.
