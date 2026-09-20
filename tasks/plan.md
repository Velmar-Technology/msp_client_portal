# Implementation Plan: Pull Request Protocol & Template Standard

## Overview
Standardize the Pull Request authoring, verification, and AI/bot review workflow across `msp_client_portal` based on the visual reference image. This establishes a high-fidelity GitHub PR template, review etiquette guidelines, and updates repository agent rules (`AGENTS.md` and `CONTRIBUTING.md`).

## Architecture Decisions
1. **Visual Reference Parity**:
   - Mirror the structure in the provided PR image: Conventional commit title, structured Context ("why"), Screenshots/Visual Evidence block, numbered "Steps to verify the change", Type checkboxes, and Pre-flight Checklist.
2. **Hybrid Workflow (Human + AI Agent)**:
   - Designed for human developers and autonomous AI agents alike.
   - Enforces the non-decreasing test threshold and zero-suppression policy defined in `CONSTRAINTS.md`.
3. **AI Bot Review Etiquette**:
   - Establish a clear convention for triaging automated bot reviews (CodeRabbit, Copilot, GitHub Actions), applying unified diff suggestions, and resolving review threads.
4. **Lightweight Gating**:
   - Prescriptive template and clear cultural/agent expectations without fragile CI regex scripts that fail PRs when screenshots are omitted.

## Task List

### Phase 1: GitHub Template & Protocol Documentation
- [ ] Task 1: Create `.github/pull_request_template.md` with visual proof, verification recipe, and constraint checklist
- [ ] Task 2: Create `docs/guidelines/pull-request-protocol.md` with AI bot review etiquette and 90-second review guidelines

### Checkpoint: Templates and Docs
- [ ] Markdown files parse cleanly with valid links and formatting

### Phase 2: Repository Guidelines & Agent Integration
- [ ] Task 3: Update `CONTRIBUTING.md` with PR standards and link to the PR template
- [ ] Task 4: Update `AGENTS.md` Section 9 & 10 to formalize PR and walkthrough formatting for AI agents

### Checkpoint: Complete
- [ ] All tasks completed and verified
- [ ] Definition of Done satisfied

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| Overly complex template ignored by developers | Medium | Keep sections compact with helpful placeholder comments and clear examples. |
| Incompatible markdown rendering on GitHub | Low | Use standard GitHub-Flavored Markdown (GFM) tables, checkboxes, and collapsibles. |

## Open Questions
- None. Requirements agreed upon during idea refinement.
