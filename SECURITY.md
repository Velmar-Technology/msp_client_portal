# Security Policy

## Reporting a Vulnerability

Security is a core tenant of this platform. We take vulnerability reports seriously
and will respond as quickly as possible.

**Please do NOT open a public issue for security problems.** Report privately to
the maintainers at `seguridad@velmartech.com.do`.

### What to include

- Affected component, endpoint, or module (e.g. `tickets`, `billing`, `authz`).
- A description of the vulnerability and its potential impact.
- Steps to reproduce, including any relevant payloads (sanitized — no live
  customer data, credentials, or tokens).
- Suggested remediation (optional).

## Response Timeline

| Stage                        | Target time                                   |
| :--------------------------- | :-------------------------------------------- |
| Acknowledgment               | Within 48 hours                               |
| Triage & severity assessment | Within 5 business days                        |
| Fix landed on `stage`        | Critical/High: ASAP; Medium/Low: next release |
| Public disclosure            | After a fix is deployed and users are updated |

## Scope

In scope: the `server`, `client`, `packages/*` workspaces, the Tauri desktop
agents (`msp-tray`, `msp-agent`), and the MCP server in this repository.

Out of scope: third-party dependencies (report upstream), misconfigurations in
deployed infrastructure, and issues requiring physical, unethical, or destructive
testing.

## Security-First Development

- Secrets never live in the repository — use `.env` (never committed).
- AuthN/Z uses short-lived JWTs; workload identity uses SPIFFE-shaped ephemeral
  tokens with 5-minute TTL.
- Authorization is enforced server-side via RBAC + Zanzibar ReBAC + policy-as-code
  ABAC (zero standing privileges).
- Sensitive data (device vault credentials) is escrowed server-side and never
  exposed in plaintext to workers.
