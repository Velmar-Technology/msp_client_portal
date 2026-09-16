# ADR-010: Web-Native Bring-Your-Own-Key (BYOK) Architecture, Dominican Law 172-13 In-Memory Anonymization, and Zero-Secret Desktop MCP Proxy Synchronization

## Status
Accepted

## Date
2026-09-16

## Context
As Velmar Technology expands its Managed Service Provider (MSP) offerings into **AI-as-a-Service (AIaaS)** and educational governance under the Common Assessment Framework (**CAF** / Marco Común de Evaluación), client institutions (schools, colleges, educational networks) require autonomous AI agents to audit documentation, evaluate evidence, analyze community survey sentiments, and generate institutional improvement plans (PMI).

However, implementing AI workflows across educational institutions introduced three critical architectural and operational challenges:

1. **Financial Liability & Token Arbitrage Risk:**
   If Velmar resold or proxied LLM tokens through centralized platform billing, the MSP would absorb significant financial exposure from runaway batch jobs, token volatility, and complex tax withholding on micro-transactions. A strict **Zero-Liability Policy** is mandatory: clients must consume tokens directly against their own upstream provider accounts (OpenAI or Anthropic).

2. **Dominican Republic Law No. 172-13 (Personal Data Protection):**
   Educational documentation contains sensitive PII of minors and faculty (Dominican Cédulas, school IDs/matrículas, full names, addresses, disciplinary notes, grades). Transmitting raw student or teacher identities directly to third-party public AI APIs violates Dominican Law 172-13. Data must be sanitized deterministically *before* crossing the network boundary to LLM providers.

3. **Desktop Configuration Usability & Secret Escrow:**
   Previous MCP integrations required users to manually edit local desktop JSON files (e.g. `claude_desktop_config.json`), exposing raw secret API keys (`sk-proj-...`, `sk-ant-...`) in plaintext on shared office or staff-room computers. Non-technical school directors and quality committee members struggled with JSON syntax errors, and revoking compromised keys required physically visiting each endpoint.

---

## Decision

We implement a **Dual-Surface Bring-Your-Own-Key (BYOK) Architecture** combining a web-native management interface with an authenticated, zero-secret remote Model Context Protocol (MCP) server proxy:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT WEB BROWSER                                     │
│  /settings/ai (ByokSettingsPage)                                                       │
│  - BL-204 Entitlement Guard (FEATURE_CODES.CAF_EDUCATION_AGENT)                        │
│  - Web Configuration: Provider, Model, Masked Key ("sk-p...7890"), Connectivity Test   │
│  - Desktop Setup: Generates Zero-Secret claude_desktop_config.json snippet             │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ HTTPS (JWT Authenticated)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PORTAL BACKEND (EXPRESS 5)                                │
│                                                                                        │
│  [TenantByokController]                                                                │
│  ├── PUT /api/v1/byok (requireSubscriptionFeature)                                     │
│  ├── GET /api/v1/byok/status (Returns keyMasked, isConfigured, no raw secrets)         │
│  ├── POST /api/v1/byok/test (In-memory connectivity validation)                         │
│  └── GET /api/v1/internal/byok/:tenantId (Protected by MSP_API_KEY)                    │
│                                                                                        │
│  [TenantByokService]                                                                   │
│  ├── AES-256-GCM Encryption / Decryption with IV & Auth Tag                            │
│  └── Key Masking (sk-pr...7890)                                                        │
│                                                                                        │
│  [PostgreSQL: tenant_byok_credentials]                                                 │
│  └── (tenant_id, provider, encrypted_api_key, key_iv, key_auth_tag, key_masked)        │
└────────────────────────────────────────▲───────────────────────────────────────────────┘
                                         │ Internal M2M Sync
                                         │ (MSP_API_KEY)
┌────────────────────────────────────────┴───────────────────────────────────────────────┐
│                           PRIVATE MCP SERVER (@msp/mcp-server)                         │
│                                                                                        │
│  Endpoint: https://helpdesk.velmartech.com.do/mcp/caf                                  │
│  Inbound Header: X-Tenant-Id: <uuid> (No API Keys on Desktop!)                        │
│                                                                                        │
│  [TenantByokManager]                                                                   │
│  └── ensureTenantProfile(): Resolves decrypted key on-demand via portal internal route │
│                                                                                        │
│  [CafPrivacyFilter]                                                                    │
│  └── Law 172-13 In-Memory Anonymizer: Cédulas, Matrículas, Emails, Phones              │
│                                                                                        │
│  [CafQualityAgent]                                                                     │
│  └── Audits 9 CAF criteria using sanitized prompts & client's own LLM credentials      │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ Sanitized Egress
                                         ▼
                        [ OpenAI / Anthropic APIs ]
```

### 1. Database Persistence & Cryptographic Isolation
- Stored in the dedicated `tenant_byok_credentials` table with a strict `tenant_id` unique foreign key (`onDelete: cascade`).
- All API keys are encrypted at rest using **AES-256-GCM** with cryptographic random initialization vectors (IV) and authentication tags (`key_auth_tag`).
- No plaintext API key is ever written to disk or returned in API responses. The API exclusively returns `keyMasked` (e.g. `sk-pr...7890`) for verification.

### 2. Contract-First API & Feature Gating (BL-204)
- Request payloads and query schemas are defined in `@shared/contracts` (`ByokProviderSchema`, `TenantByokConfigInputSchema`, `TenantByokStatusSchema`, `TestByokConnectionInputSchema`).
- Endpoints are gated by `requireSubscriptionFeature(FEATURE_CODES.CAF_EDUCATION_AGENT)`. Non-entitled tenants receive HTTP 403 or the interactive `<FeatureLockedPreview>` upsell view on the frontend.
- An internal service endpoint `GET /api/v1/internal/byok/:tenantId` is protected by `MSP_API_KEY`, allowing the private MCP server to decrypt keys on demand without end-user credentials.

### 3. Dominican Law 172-13 In-Memory Privacy Filter (`CafPrivacyFilter`)
- Prior to dispatching prompts to OpenAI or Anthropic, `CafPrivacyFilter` sanitizes:
  - **Dominican Cédulas & RNC:** `001-1234567-8` $\rightarrow$ `[CEDULA_01]`
  - **School Matrículas:** `2024-0891` $\rightarrow$ `[MATRICULA_01]`
  - **Emails & Telephones:** `profesor@colegio.edu.do` $\rightarrow$ `[EMAIL_01]`
  - **Student & Faculty Names:** `Estudiante Carlos Peña` $\rightarrow$ `Estudiante [ESTUDIANTE_01]`
- The pseudonym mapping table exists solely in volatile server RAM and is discarded after execution.

### 4. Zero-Secret Desktop MCP Integration
- Educational staff using **Claude Desktop** or **Cursor** configure their client with a zero-secret snippet generated in `/settings/ai`:
  ```json
  {
    "mcpServers": {
      "caf-quality-agent": {
        "url": "https://helpdesk.velmartech.com.do/mcp/caf",
        "headers": {
          "X-Tenant-Id": "11111111-2222-3333-4444-555555555555"
        }
      }
    }
  }
  ```
- The desktop configuration contains **zero API keys**. The MCP proxy parses `X-Tenant-Id`, contacts the portal backend to resolve the institution's encrypted BYOK credentials, applies privacy filters, and executes the CAF tools seamlessly.
- If a school rotates or revokes an API key in the portal web interface, all desktop agents reflect the change immediately without requiring manual configuration updates.

---

## Alternatives Considered

### Alternative 1: Local JSON Configuration Files with Plaintext Keys
- **Pros:** Simplest to implement; MCP server reads directly from environment variables or local JSON.
- **Cons:** Exposes raw OpenAI/Anthropic master keys on school computers; high risk of credential theft; requires non-technical teachers to manually locate and edit hidden JSON files in AppData.
- **Rejected:** Unacceptable security posture and excessive support burden.

### Alternative 2: Velmar Centralized Token Wallet & Resale
- **Pros:** Fully centralized billing; school enters no external keys.
- **Cons:** Forces Velmar to absorb micro-billing debt, currency exchange risks, tax withholding complexities, and liability for unintended customer token burn.
- **Rejected:** Violates the foundational business principle of Zero Financial Liability for AI compute.

### Alternative 3: Browser-Only Direct LLM Calls
- **Pros:** Does not require an MCP server proxy.
- **Cons:** Incompatible with desktop environments (Claude Desktop, Cursor, Copilot Studio); cannot access server-side Nextcloud evidence repositories; leaves sensitive school evidence in browser memory.
- **Rejected:** Fails the requirement for seamless CAF documentary analysis and dual-surface workflow.

---

## Consequences

### Positive
- **Zero Token Liability:** Institutions pay upstream AI providers directly; Velmar charges purely for software licensing, hosting, and MSP SLA support.
- **Full Regulatory Compliance:** Strict in-memory pseudonymization guarantees adherence to Dominican Law No. 172-13.
- **Frictionless Onboarding:** Directors configure credentials once in a familiar web UI with live reachability testing and latency telemetry.
- **Endpoint Immunity:** Zero secrets stored on local workstations prevents credential leakage from physical theft or malware.
- **Centralized Revocation:** Revoking or rotating a key in the portal instantly de-authorizes or updates all remote MCP agent sessions.

### Neutral / Operational Considerations
- **Internal Network Latency:** MCP server makes an initial internal HTTP request to fetch the institution's BYOK profile, which is cached in volatile memory for subsequent tool calls.
- **Network Dependency:** Requires the MCP server container to maintain internal connectivity with the portal backend via `MSP_API_URL` and `MSP_API_KEY`.
