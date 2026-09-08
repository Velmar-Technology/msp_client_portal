# Implementation Plan: Vital Services Health Diagnostics & System API Status MCP Tools

## Overview
Breakdown and stabilization of the newly introduced MCP diagnostic tools (`msp_check_domain_services` and `msp_get_system_api_status`) in `packages/mcp-server`. This equips AI agents and MSP technicians with automated diagnostic capabilities for client domains (resolving DNS, inspecting mail server ports SMTP 25/587/465, IMAP 993, POP3 995, and verifying HTTPS availability and SSL certificates) alongside real-time internal platform health diagnostics.

---

## Architecture Decisions

1. **Protocol Adherence & Sandboxing (`packages/mcp-server`):**
   - Implements native Node.js network primitives (`node:dns/promises`, `node:net`, `node:tls`, `node:https`) with explicit socket timeouts (default 4000ms) and automatic socket teardown (`socket.destroy()`) to prevent socket leaks or hanging MCP requests.
   - Conforms to the Model Context Protocol specification (MCP 2026-07-28).

2. **Type Safety & TLS Certificate Normalization:**
   - In Node.js `tls.PeerCertificate`, certificate fields like `issuer.O` and `issuer.CN` can be returned as `string | string[]`.
   - Provide safe normalization: `formatCertField(val?: string | string[]): string` to ensure strict TypeScript compilation (`tsc`) passes without errors.

3. **Domain Service Inspection Strategy:**
   - Evaluates DNS A, AAAA, MX, and TXT/SPF records.
   - Probes common mail ports against MX exchanges and target domain.
   - Evaluates HTTPS certificate expiration, issuer, subject, and reachability.
   - Produces clean, rich Markdown diagnostic tables readable by LLM agents.

4. **Internal System Status Ingestion:**
   - Connects to backend `/system/api-status` (Admin-authenticated) via `MspApiClient`.
   - Exposes structured JSON metrics covering database latency, Nextcloud health, uptime, and environment configuration status.

---

## Task List

### Phase 1: Fix Type Safety & Build Stabilization
- [x] Task 1.1: Fix TypeScript Compilation TS2322 in `domainTools.ts`
- [x] Task 1.2: Add Strongly-Typed Contract for `getSystemApiStatus()` in `MspApiClient.ts`
- [x] Checkpoint 1: Clean Build Verification (`npm --prefix packages/mcp-server run build`)

### Phase 2: Unit Testing & Diagnostic Validation
- [x] Task 2.1: Implement Unit Tests for `msp_get_system_api_status` in `tools.test.ts`
- [x] Task 2.2: Implement Unit Tests for Domain Probing Logic & Error Handling
- [x] Checkpoint 2: All Vitest Tests Green (`npm --prefix packages/mcp-server run test`)

### Phase 3: Monorepo Quality Gates & Documentation
- [x] Task 3.1: Monorepo Full Verification (`npm run build:packages`, `server build`, `client build`)
- [x] Task 3.2: Verify Documentation in `packages/mcp-server/README.md`
- [x] Checkpoint 3: Ready for Merge / Commit

### Phase 4: Email & Notification Tools
- [x] Task 4.1: Implement `msp_get_last_email` and `msp_list_notifications`
- [x] Checkpoint 4: Ready for Merge / Commit

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Network Socket Hangs:** Target firewalls dropping packets silently causing TCP probe timeouts. | Medium | Enforces strict 4000ms socket timeouts with immediate `socket.destroy()` upon error or timeout event. |
| **Untrusted / Self-Signed SSL Certs:** Diagnostic probe failing on self-signed certs. | Low | Uses `rejectUnauthorized: false` during probe to inspect and report cert details even if expired or untrusted. |
| **API Client Authentication:** `GET /system/api-status` requires `ADMIN` role. | Medium | Properly catches and returns structured MCP error message if the API token lacks sufficient permissions. |

---

## Open Questions
- None. Requirements and interfaces align with existing backend API contracts and MCP architecture.
