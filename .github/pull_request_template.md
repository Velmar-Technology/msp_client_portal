<!-- 
  PR Title Format: <type>(<scope>): <imperative summary>
  Examples:
    feat(tickets): add automated round-robin technician assignment
    fix(billing): resolve itbis tax calculation precision in dop invoices
    improvement(ui): progressively render notifications drawer
-->

## Context
<!-- 
  Provide background and business motivation. Why is this change necessary?
  Link any relevant issues or tickets (e.g., Closes #123, Ref #456).
-->


## Screenshots / Visual Evidence
<!-- 
  For UI/UX changes: Include clear screenshots or screen recordings (Light & Dark theme where applicable).
  For Backend/CLI/API changes: Include terminal command logs, curl output, or test execution results.
-->


## Steps to verify the change
<!-- 
  Provide a concrete, step-by-step reproduction and verification recipe for the reviewer:
  1. Sign in as role [e.g., Client User, Admin, Technician]
  2. Navigate to [e.g., /portal/notifications]
  3. Perform action [e.g., click on the notification bell dropdown]
  4. Verify expected outcome [e.g., observe progressive loading skeleton without flicker]
-->
1. 
2. 
3. 

## Type
- [ ] Fix (bug fix addressing an issue without breaking existing functionality)
- [ ] Feature (new feature or capability)
- [ ] Improvement (performance optimization, UI polish, or progressive enhancement)
- [ ] Refactor (code structure or clean code improvements with no behavioral changes)
- [ ] Docs (documentation updates or ADR additions)
- [ ] Other (dependencies, CI/CD, build tooling)

## Master Business Logic & Contracts (if applicable)
- [ ] Implements or touches Master Business Logic (Rule code: `BL-___`)
- [ ] Changes or extends `@shared/contracts` API schemas

## Checklist
- [ ] I have tested these changes locally and verified all edge cases.
- [ ] I have added or updated tests, and the test suite passes (`npm -w server run test` / `npm -w client run test:run`).
- [ ] Adheres to `CONSTRAINTS.md` (Zero new `@ts-ignore` / `eslint-disable` suppressions; test counts held or increased).
- [ ] Clean compilation with zero TypeScript errors (`npm -w server run build` / `npm -w client run build`).
- [ ] I have reviewed the [Contributing Guide](CONTRIBUTING.md) and [PR Protocol](docs/guidelines/pull-request-protocol.md).
