# Pull Request Protocol & Review Guidelines

## Overview
This document outlines the standard pull request workflow for the **MSP Client Portal** monorepo. It governs how both human engineers and AI coding agents author, document, verify, and review code changes before merging into `stage` or `main`.

---

## 1. The 90-Second Reviewer Principle
Code review is cognitive labor. A great PR is designed from the reviewer's perspective:
> **Goal:** A reviewer should understand **why** the change exists, see **visual proof** of its execution, and know **how to verify** it in under 90 seconds.

### The Anatomy of an Ideal PR:
1. **Semantic Title:** Formatted as `<type>(<scope>): <summary>` (e.g. `improvement(ui): progressively render notifications drawer`).
2. **Context:** 2-3 sentences explaining the root problem and business rationale, linked to the tracker issue or ticket.
3. **Visual Evidence:** High-fidelity screenshots (light & dark theme) or screen recordings for frontend; terminal/curl output for backend.
4. **Verification Recipe:** A step-by-step reproduction path that anyone can test without guessing.
5. **Quality Floor:** Checkboxes confirming clean builds, passing tests, and adherence to `CONSTRAINTS.md`.

---

## 2. Visual Proof Requirements

### Frontend & UI/UX Changes
- **Screenshots:** Mandatory for visual modifications. Include both default and dark mode when color palettes or contrast are impacted.
- **Micro-Animations / Drawers / Dialogs:** Use screen recordings or GIFs for dynamic states, transitions, or asynchronous skeleton loadings.
- **Empty States & Edge Cases:** Capture both populated views and zero-state / error boundaries.

### Backend & Core Services
- **Terminal Logs:** Capture CLI execution or successful test suite outputs.
- **API Responses:** Include formatted JSON responses or curl requests demonstrating HTTP status codes, headers (`X-User-Id`, `X-Tenant-Id`), and response payloads.

---

## 3. Step-by-Step Verification Recipes
Never write vague verification steps like *"tested locally"* or *"works as expected"*. Provide an explicit, numbered recipe:

```markdown
## Steps to verify the change
1. Sign in as a Client user with role `CLIENT_USER` (`testclient@tenant.local`).
2. Navigate to `/portal/notifications` or click the bell icon in the top navigation bar.
3. Ensure the notifications drawer displays progressive skeleton placeholders during fetch.
4. Mark a notification as read and verify optimistic state updates immediately in the UI.
5. Inspect the Network tab to confirm `PATCH /api/v1/notifications/:id/read` returns HTTP 200.
```

---

## 4. Collaborative AI Bot & Automated Review Protocol

In this repository, automated review agents (e.g., CodeRabbit AI, GitHub Actions, static analysis linters) review every pull request. Authors and reviewers should follow these collaboration rules:

### A. Triage of Actionable Inline Diff Suggestions
- **High-Fidelity Suggestions:** When a bot suggests a refactor or performance fix with a unified diff snippet (`+` / `-`), evaluate the logic:
  - If valid and safe, apply the suggestion directly via GitHub's **"Apply suggestion"** button.
  - Run the local test suite (`npm run test`) to ensure no regressions were introduced.
- **Counter-Arguments / False Positives:** If a bot suggestion is incorrect, hallucinated, or violates our architectural boundaries (e.g., importing DB directly in services), **reply to the thread with a concise technical explanation** before resolving. Do not silently dismiss or delete bot comments.

### B. Confidence Scores & Summaries
- **Review Summary Table:** Automated review summaries report touched files, complexity score, and confidence rating (e.g., `Confidence Score: 8/10`).
- **Low Confidence Alerts:** If a bot review flags an area with low confidence or security warnings (e.g., SQL injection risk, missing tenant isolation, or unhandled promise rejection), the author **must** explicitly address the flagged concern before requesting human approval.

### C. Thread Resolution Etiquette
- A PR thread is resolved only when:
  1. The suggested code change has been committed, OR
  2. The author has clarified why the existing code is intentional, and reviewers agree.

---

## 5. Architectural Invariants & Master Logic Check

When authoring a pull request touching business logic or shared types:
1. **Master Business Logic (`BL-xxx`):** Check if the change modifies rules defined in [AGENTS.md](file:///c:/Users/eapolanco/Workspace/msp_client_portal/AGENTS.md) (e.g., `BL-101` SLA cancellation, `BL-701` ITBIS tax, `BL-801` technician commissions). Tag the rule code in the PR description.
2. **Contract-First Verification:** If changing request/response structures, verify that changes originated in `packages/contracts/` (`@shared/contracts`) before updating frontend or backend consumers.
3. **Zero-Suppression Guarantee:** Ensure no `@ts-ignore`, `eslint-disable`, or bypassed tests are introduced to satisfy CI.
