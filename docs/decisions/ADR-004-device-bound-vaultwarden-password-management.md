# ADR-004: Device-Bound Vaultwarden Password Management Architecture

## Status
Accepted

## Date
2026-09-03

## Context
Our MSP client portal currently provides hosted, multi-tenant Vaultwarden integration for individual users (`PASSWORD_MANAGER` feature code). However, modern MSP clients (clinics, law firms, retail points of sale, shared accounting workstations, and reception desks) frequently encounter a credential security and operational challenge:

1. **Shared Workstations & High Turnover:** Physical endpoints are frequently utilized by multiple rotating employees or shift workers. Binding vault accounts exclusively to personal user identities creates severe friction, causes unmanaged credential sprawl, or leads to workers scribbling passwords on physical sticky notes.
2. **Plaintext Exposure Risk:** Workers must be able to autofill workstation-specific credentials (e.g., local management portals, carrier portals, internal tools) without viewing, copying, or exporting the raw plaintext passwords.
3. **Endpoint Compromise & Theft Exposure:** If a physical device (laptop or workstation) is lost, stolen, or compromised, administrators need an instant, remote 1-click mechanism to de-authorize and terminate all active Bitwarden sessions on that specific machine, without disabling the employee's personal or company-wide credentials.

We needed a standardized architectural pattern that scopes password credentials to physical equipment slots (`subscription_equipment`), guarantees zero plaintext leakage to workers, preserves zero-knowledge cryptography, and provides client administrators with immediate remote control.

---

## Decision

We adopt a **Device-Bound Workstation Vault** architecture integrated directly into the Equipment management domain:

1. **Machine Identity & Collection Isolation:**
   - Each provisioned physical endpoint slot is represented in Vaultwarden by:
     - A dedicated Bitwarden **Collection**: `Device: <DeviceName>`
     - A dedicated **Machine User Identity**: `device_<equipmentSlotId>@tenant.local`
   - Access to the collection is granted with a strict **`hidePasswords: true`** policy, enabling browser extension / desktop app autofill while preventing endpoint operators from revealing plaintext credentials in the web vault or extension UI.

2. **Schema & Contract-First Persistence:**
   - The Drizzle `subscription_equipment` entity and `@shared/contracts` schema are extended with 5 state columns:
     - `vaultwarden_org_id`: UUID of the tenant's Bitwarden organization.
     - `vaultwarden_collection_id`: UUID of the device-specific collection.
     - `vaultwarden_device_user_id`: UUID of the managed machine user.
     - `vaultwarden_status`: Enum (`UNPROVISIONED`, `ACTIVE`, `LOCKED`).
     - `vaultwarden_last_synced_at`: Timestamp of last sync or lock action.

3. **Domain Layer Orchestration & Multi-Tenant Boundaries:**
   - `EquipmentService` acts as the boundary orchestrator, delegating external Bitwarden operations to `VaultwardenService`.
   - All operations strictly enforce tenant isolation (`tenantId` matches the authenticated session, or the caller is a global `ADMIN`).
   - Domain operations throw typed domain errors from `@shared/errors` (`NotFoundError`, `ForbiddenError`).

4. **Emergency Remote Revocation & Killswitch:**
   - Executing `POST /api/v1/equipment/:id/vault/revoke` calls Vaultwarden's user revocation API (`PUT /api/organizations/{orgId}/users/{deviceUserId}/revoke`).
   - This invalidates all active Bitwarden session tokens and sync caches on that workstation immediately.
   - The device status transitions to `LOCKED`, and the UI displays alert warnings with a 1-click option to re-provision once physical custody is verified.

5. **Plan Feature Gating (BL-204) & Domain Boundary Integrity:**
   - Physical equipment records (`subscription_equipment`) reference their assigned plan ID (`plan?: string`), keeping features strictly bound to catalog `Plan` entities to prevent denormalization and cache drift.
   - `EquipmentService.enforceDevicePasswordManagerEntitlement(subscriptionId)` gates backend vault inspection, provisioning, and revocation for non-admin callers, evaluating `FEATURE_CODES.PASSWORD_MANAGER` or bundled equivalents (`PASSWORD_DARK_WEB`).
   - MSP Admins (`byAdmin === true`) bypass plan feature gating across all equipment slots.

6. **Frontend Upgrade Lock UX & Action Menu Discoverability:**
   - Instead of completely hiding the vault action on non-entitled machines, `DevicesPage` renders the "Device Password Vault" dropdown item with a compact **`Upgrade` lock badge** (`Lock` icon + amber badge), aligning with the sidebar's navigation lock standard.
   - When clicked on an unentitled device slot, `DeviceVaultModal` opens in a dedicated **Plan Upgrade Required** preview mode. It highlights workstation-level benefits, details what the feature unlocks, and provides a direct CTA to `/plans` without firing unentitled 403 API requests.

7. **Two-Tier Password Architecture (User Vault vs. Device Vault):**
   - **User Vault (`/password-manager` / `PasswordManagerPage`):** Scoped to human employee accounts (`user@tenant.com`). Provides browser extension download links, web vault access, and self-service master password reset invitations.
   - **Device Vault (`DeviceVaultModal` / `BL-205`):** Scoped to physical machine inventory (`device_<slotId>@tenant.local`). Enables workers to autofill machine credentials without seeing plaintext secrets (`hidePasswords: true`), while giving client administrators an emergency 1-click remote killswitch per machine slot.

---

## Alternatives Considered

### 1. Purely Shared Master Password Per Workstation
* **Pros:** Simple to implement; no collection-level permissioning needed.
* **Cons:** Workers can copy/paste plaintext credentials, change the master passphrase, or export the entire vault to external drives. Cannot revoke access when a worker leaves without changing every password on the machine.
* **Verdict:** Rejected due to unacceptable credential leakage and lack of non-repudiation.

### 2. Personal Vault Accounts Only (Relying on User Groups)
* **Pros:** Uses standard user-level Vaultwarden seats.
* **Cons:** Fails on multi-shift shared devices (receptionists, cashiers, nurses); logging in/out of Bitwarden extension between 15-minute shifts creates extreme friction. If a laptop is stolen, administrators have to suspend the user rather than the device.
* **Verdict:** Rejected because it treats devices as people, violating the operational reality of MSP client environments.

### 3. Hiding Action Menu Item on Non-Entitled Devices
* **Pros:** Prevents unauthorized clicks entirely.
* **Cons:** Makes the feature invisible and non-discoverable to clients evaluating upgrades; creates confusion when comparing active plans.
* **Verdict:** Replaced by the **Upgrade Lock** pattern (matching `PasswordManagerPage` in sidebar), pairing an amber lock badge with an in-modal upsell preview.

---

## Consequences

- **Security Posture:** Workers gain frictionless autofill productivity with zero visibility into plaintext secrets (`hidePasswords: true`).
- **Incident Response:** Stolen or missing laptops can be neutralized in under 3 seconds with a single click in the client portal.
- **Auditing & Governance:** All vault provisioning and revocation events are logged with equipment UUID, tenant ID, and actor details.
- **Conversion & Upsell:** Clients on basic plans discover advanced device security capabilities directly within equipment tables, with clear upgrade paths to qualifying tiers.
- **Maintainability:** Fully conforms to the Monorepo's Contract-First (`@shared/contracts`) and Clean Architecture rules, verified by 26 targeted automated tests and monorepo regression suites.
