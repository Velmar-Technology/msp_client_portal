# Task Breakdown: Vital Services Health Diagnostics & System API Status MCP Tools

## Phase 1: Fix Type Safety & Build Stabilization

### Task 1.1: Fix TypeScript Compilation TS2322 in `domainTools.ts`
**Description:** Resolve the type error on line 158 where `cert.issuer.O` / `cert.issuer.CN` is of type `string | string[]` by implementing safe normalization helper `formatCertField`.
**Acceptance criteria:**
- [x] Implement `formatCertField(field?: string | string[]): string` returning a single comma-separated string or `'Unknown'`.
- [x] Update `domainTools.ts` to cleanly format `subject` and `issuer` without type mismatches.
**Verification:**
- [x] `npm --prefix packages/mcp-server run build` compiles with 0 TypeScript errors.
**Dependencies:** None
**Files touched:**
- `packages/mcp-server/src/tools/domainTools.ts`
**Estimated scope:** Small (1 file)

---

### Task 1.2: Add Strongly-Typed Contract for `getSystemApiStatus()` in `MspApiClient.ts`
**Description:** Define and export `SystemApiStatusResponse` and sub-interfaces in `MspApiClient.ts` and `types.ts` so `getSystemApiStatus()` has explicit typing instead of `Promise<any>`.
**Acceptance criteria:**
- [x] Export `SystemApiStatusResponse`, `ApiStatusItem`, and `EnvVarStatusItem` in `packages/mcp-server/src/types.ts`.
- [x] Type `getSystemApiStatus(): Promise<SystemApiStatusResponse>` in `packages/mcp-server/src/client/MspApiClient.ts`.
**Verification:**
- [x] `npm --prefix packages/mcp-server run build` succeeds cleanly.
**Dependencies:** Task 1.1
**Files touched:**
- `packages/mcp-server/src/types.ts`
- `packages/mcp-server/src/client/MspApiClient.ts`
**Estimated scope:** Small (2 files)

---

## Checkpoint 1: Clean Build Verification
- [x] `npm --prefix packages/mcp-server run build` completes with exit code 0.

---

## Phase 2: Unit Testing & Diagnostic Validation

### Task 2.1: Implement Unit Tests for `msp_get_system_api_status` in `tools.test.ts`
**Description:** Add unit tests to verify `msp_get_system_api_status` tool execution, successful API client response parsing, and graceful error handling on failures.
**Acceptance criteria:**
- [x] Test case for successful `getSystemApiStatus` query returning structured JSON output.
- [x] Test case for failed API query returning `isError: true` with error description.
**Verification:**
- [x] `npm --prefix packages/mcp-server run test` passes (15 passed).
**Dependencies:** Checkpoint 1
**Files touched:**
- `packages/mcp-server/src/tools/tools.test.ts`
**Estimated scope:** Small (1 file)

---

### Task 2.2: Implement Unit Tests for Domain Probing Logic & Error Handling
**Description:** Add unit tests verifying DNS error handling, email port probe formatting, and SSL cert inspection logic.
**Acceptance criteria:**
- [x] Test coverage for domain services MCP tool registration.
- [x] Test execution of `msp_check_domain_services` tool callback generating markdown audit output.
**Verification:**
- [x] `npm --prefix packages/mcp-server run test` passes 100%.
**Dependencies:** Task 2.1
**Files touched:**
- `packages/mcp-server/src/tools/tools.test.ts`
**Estimated scope:** Small (1 file)

---

## Checkpoint 2: All Vitest Tests Green
- [x] Vitest test suite in `packages/mcp-server` passes with 0 regressions (15/15 passing).

---

## Phase 3: Monorepo Quality Gates & Documentation

### Task 3.1: Monorepo Full Verification
**Description:** Ensure monorepo packages build without regressions and all existing tests continue passing.
**Acceptance criteria:**
- [x] `npm run build:packages` succeeds with exit code 0.
- [x] `npm -w server run build` succeeds with exit code 0.
**Verification:**
- [x] Build commands exit code 0.
**Dependencies:** Checkpoint 2
**Files touched:** None (verification task)
**Estimated scope:** Small

---

### Task 3.2: Verify Documentation in `packages/mcp-server/README.md`
**Description:** Ensure Section 8 of `packages/mcp-server/README.md` accurately documents both tools with parameter descriptions.
**Acceptance criteria:**
- [x] Tool inputs and outputs documented in `README.md`.
- [x] Aligned with MCP 2026-07-28 standard.
**Verification:**
- [x] Documentation verified.
**Dependencies:** Task 3.1
**Files touched:**
- `packages/mcp-server/README.md`
**Estimated scope:** Small (1 file)

---

## Phase 4: Email & Notification Inspection Tools

### Task 4.1: Implement `msp_get_last_email` and `msp_list_notifications`
**Description:** Add email and notification inspection capabilities via TLS IMAP mailbox query and backend transactional notification log retrieval.
**Acceptance criteria:**
- [x] Implement `fetchLatestImapEmail` over TLS socket and `registerEmailTools` in `packages/mcp-server/src/tools/emailTools.ts`.
- [x] Add `getNotifications` in `MspApiClient.ts`.
- [x] Register tools in `serverFactory.ts` and document in `README.md`.
- [x] Unit tests added in `tools.test.ts` (16 tests green).
**Verification:**
- [x] `npm -w packages/mcp-server test` passes cleanly.
- [x] `npm -w packages/mcp-server run build` compiles with 0 errors.
**Dependencies:** Checkpoint 3
**Files touched:**
- `packages/mcp-server/src/tools/emailTools.ts`
- `packages/mcp-server/src/client/MspApiClient.ts`
- `packages/mcp-server/src/types.ts`
- `packages/mcp-server/src/serverFactory.ts`
- `packages/mcp-server/src/tools/tools.test.ts`
- `packages/mcp-server/README.md`
**Estimated scope:** Medium (6 files)

---

## Checkpoint 4: Ready for Merge / Commit
- [x] Definition of Done verified.

