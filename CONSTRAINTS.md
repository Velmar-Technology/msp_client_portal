# Constraints

Last reviewed: 2026-09-01

## Floor (always enforced)

- No new suppression comments: `@ts-ignore`, `eslint-disable`, `/* eslint-disable */`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a explicit justification in the commit message
- No secrets in source code or environment templates
- This file does not get weakened to make a change pass

## Enforced Quality Standards

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Server Types | Zero type errors | `npm -w server run build` | pre-commit, task end, CI |
| Client Types | Zero type errors | `npm -w client run build` | pre-commit, task end, CI |
| Package Types | Zero type errors | `npm run build:packages` | pre-commit, task end, CI |
| Backend Tests | 100% test suite pass (70+ test files) | `npm -w server run test` | task end, CI |
| Frontend Tests | 100% test suite pass (34+ test files) | `npm -w client run test:run` | task end, CI |
| Architecture | Strict Dependency Inversion & Gateway Boundaries | Import linter / code review | review, CI |

## Measured, Hold the Line

| Metric | Baseline | Direction |
|--------|----------|-----------|
| Server Test Files | 70 passed | must not decrease |
| Server Tests | 698 passed | must not decrease |
| Client Test Files | 34 passed | must not decrease |
| Client Tests | 208 passed | must not decrease |
