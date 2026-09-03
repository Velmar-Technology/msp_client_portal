# Self-Service Vault Reset & Re-Invite for Hosted Vaultwarden

## Problem Statement
**How Might We** allow team members locked out of their zero-knowledge password vault to self-service reset their vault and rejoin their tenant organization in under 2 minutes, without needing MSP technician intervention or compromising the tenant's shared credential security?

---

## Recommended Direction: Self-Service Deprovision & Instant Re-Invitation

In a zero-knowledge architecture (Bitwarden/Vaultwarden), the Master Password is the cryptographic encryption key. If an employee forgets it, nobody—including Velmartech MSP administrators—can recover their private ciphertext. 

Instead of filing an urgent support ticket to have a technician manually delete the user in the Vaultwarden admin portal and re-invite them, we deliver an automated **"Reset Vault Access"** flow directly inside [PasswordManagerPage.tsx](file:///c:/Users/eapolanco/Workspace/msp_client_portal/client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx):

1. **User Initiation**: A locked-out user clicks **"Reset Vault Access"** on the Password Manager page.
2. **Impact Confirmation Modal**: A strict confirmation dialog explains the cryptographic realities:
   - ⚠️ Any private, unshared credentials stored in their personal vault will be permanently deleted.
   - ✅ All shared company organization collections (IT, Accounting, Operations) remain 100% intact and safe.
   - The user must type `"RESET"` or click a double-confirmation action.
3. **Backend Orchestration (`VaultwardenService.resetUserVaultAccess`)**:
   - Authenticates the current portal user and matches their verified email with their tenant organization.
   - Calls the Vaultwarden Admin API (`/admin/users/{uuid}/delete` or `/api/organizations/{orgId}/users/{userId}`) to remove the orphaned user record.
   - Automatically issues a fresh organization invitation (`/api/organizations/{orgId}/users/invite`) to the user's email.
4. **Immediate Recovery**: The user receives a Bitwarden invitation email immediately, clicks it, defines a brand-new Master Password, and seamlessly syncs back all their company's shared collections.

---

## Key Assumptions to Validate

- [ ] **Vaultwarden Admin User Deletion**: Verify that calling the Vaultwarden Admin API to purge the user account completely clears the email from the SQLite database, allowing the subsequent invitation to prompt a fresh account creation screen rather than a login screen.
- [ ] **Organization Collection Retention**: Confirm that removing and re-inviting a user restores access to their tenant organization's shared collections once accepted by the user and confirmed by the org.
- [ ] **Rate Limiting**: Ensure a rate limit (e.g. maximum 3 reset requests per user per 24 hours) to prevent email spam or abuse.

---

## MVP Scope

### In Scope
1. **Frontend ([PasswordManagerPage.tsx](file:///c:/Users/eapolanco/Workspace/msp_client_portal/client/src/pages/PasswordManagerPage/PasswordManagerPage.tsx))**:
   - Add a dedicated **"Trouble Logging In?"** card alongside the setup guide.
   - Include a **"Reset Vault Access"** button with a destructive warning dialog (`AlertDialog`).
   - Educational badge clearly differentiating between the **MSP Portal Login Password** and the **Vault Master Password**.
2. **Backend API (`POST /api/v1/system/vault/reset-user-access`)**:
   - Endpoint in `system` module (protected by user session authentication).
   - Resolves tenant ID and verified user email from JWT session.
   - Calls `vaultwardenService.resetUserVaultAccess(tenantId, userEmail)`.
3. **Audit Logging**:
   - Log vault reset events with user ID, email, IP, and tenant ID in the system audit logs.

### Out of Scope (Not Doing & Why)
- **Escrowing or Recovering Old Private Passwords**: Cryptographically impossible under zero-knowledge principles. We will never weaken encryption or attempt to store master passwords.
- **Single Sign-On (SSO) Master Password Bypass / Key Connector**: Requires Bitwarden Enterprise Key Connector or custom HSM infrastructure, which adds high operational complexity and resource footprint for an MSP running on Linode.
- **Admin Manual Password Assignment**: Admins should never dictate user master passwords; the user must define it themselves during acceptance.

---

## User Journey
```
[User forgets Master Password]
             │
             ▼
[Navigates to /password-manager in MSP Portal]
             │
             ▼
[Clicks "Reset Vault Access"]
             │
             ▼
[Alert Dialog: Explains Personal Vault Loss vs Company Collection Safety]
             │
             ▼
[Confirm: POST /api/v1/system/vault/reset-user-access]
             │
             ▼
[Vaultwarden Service purges locked account & dispatches fresh Invite]
             │
             ▼
[User receives email -> Sets new Master Password -> Re-enrolled in Org]
```
