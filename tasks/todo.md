# Tasks: Pull Request Protocol & Template Standard

## Task 1: Create `.github/pull_request_template.md`
**Description:** Create the official GitHub Pull Request template matching the structure from the reference image, including Context, Screenshots/Visual Evidence, Steps to verify the change, Type matrix, and Constraints checklist.

**Acceptance criteria:**
- [x] PR title format guide included (`<type>(<scope>): <summary>`)
- [x] Context section with problem background and linked issue
- [x] Visual Proof / Screenshots section (supporting images/videos/terminal output)
- [x] Numbered "Steps to verify the change" reproduction recipe
- [x] Type of change checkbox matrix (`Fix`, `Feature`, `Improvement`, `Refactor`, `Docs`, `Other`)
- [x] Checklist enforcing `CONSTRAINTS.md` (no `@ts-ignore`/`eslint-disable`, tests pass, no deleted tests, local check)

**Verification:**
- [x] File exists at `.github/pull_request_template.md`
- [x] Markdown renders properly with GFM syntax

**Dependencies:** None
**Files likely touched:**
- `.github/pull_request_template.md`
**Estimated scope:** Small (1 file)

---

## Task 2: Create `docs/guidelines/pull-request-protocol.md`
**Description:** Author comprehensive PR guidelines covering the 90-second reviewer scannability rule, screenshot/evidence guidelines, step-by-step verification crafting, and AI bot review etiquette (how to review, apply diff suggestions, and resolve threads with bots like CodeRabbit).

**Acceptance criteria:**
- [x] Principles of reviewer ergonomics and the 90-second scan explained
- [x] Guidelines on taking and embedding screenshots/recordings
- [x] Verification steps format specification (preconditions, steps, expected result)
- [x] Protocol for interacting with AI reviewer bots and applying 1-click diff suggestions
- [x] PR label lifecycle and confidence score interpretation

**Verification:**
- [x] File exists at `docs/guidelines/pull-request-protocol.md`
- [x] Internal file and documentation links valid

**Dependencies:** Task 1
**Files likely touched:**
- `docs/guidelines/pull-request-protocol.md`
**Estimated scope:** Small (1 file)

---

## Task 3: Update `CONTRIBUTING.md`
**Description:** Update `CONTRIBUTING.md` to reference `.github/pull_request_template.md` and link to `docs/guidelines/pull-request-protocol.md`.

**Acceptance criteria:**
- [x] Workflow section references the PR template
- [x] Contributor guidance on visual proof and verification steps added

**Verification:**
- [x] Links in `CONTRIBUTING.md` resolve correctly

**Dependencies:** Task 2
**Files likely touched:**
- `CONTRIBUTING.md`
**Estimated scope:** Small (1 file)

---

## Task 4: Update `AGENTS.md` for AI Agent PR & Walkthrough Formatting
**Description:** Update `AGENTS.md` Sections 9 and 10 to instruct AI coding agents to follow the PR description and walkthrough standard whenever presenting completed work or drafting PRs.

**Acceptance criteria:**
- [x] Section 9 updated with PR formatting and verification evidence standard
- [x] Section 10 (Definition of Done) reinforces reproducible verification steps

**Verification:**
- [x] `AGENTS.md` formatting intact and clean

**Dependencies:** Task 3
**Files likely touched:**
- `AGENTS.md`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Complete Verification
- [x] All 4 tasks completed and verified
- [x] Git status clean and consistent
- [x] DoD satisfied
