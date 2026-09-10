# Contributing

Thanks for your interest in contributing to **MSP Help Desk — Client Portal**.

> ⚠️ This is a **proprietary** commercial project (see [LICENSE](LICENSE)). External
> contributions are **not** currently accepted. This guide documents the internal
> workflow for the development team and authorized contributors.

## Conventional Commits

The repository enforces [Conventional Commits](https://www.conventionalcommits.org/)
via Husky + commitlint on every commit.

```
<type>(<scope>): <imperative summary>
```

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Common scopes:** `rmm`, `client`, `server`, `equipment`, `system`, `tickets`, `billing`, `subscriptions`, `crm`, `notifications`, `auth`, `ui`, `i18n`, `web`, `infra`, `shared`, `deps`

## Workflow

1. Branch from `stage` (integration branch). `main` is release-protected.
2. Follow the vertical-slice feature recipe: contact → service → query hook → UI
   (`docs/architecture/feature-slice-recipe.md`).
3. Run quality gates before opening a PR:
   - `npm run build:packages`
   - `npm -w server run build` and `npm -w client run build`
   - `npm -w server run test` and `npm -w client run test:run`
   - `npm -w server run lint` and `npm -w client run lint`
4. Open a PR from your branch → `stage`. PRs to `main` go through the release process.

## Definition of Done

- Clean compilation (zero TypeScript errors).
- Green test suites with no regressions; new logic ships co-located unit tests.
- Dependency inversion respected (controllers → services → repositories).
- JSDoc/TSDoc on all exported services, hooks, and utilities, with `@param`, `@returns`, `@throws`.
- Commits conform to Conventional Commits.

## Release Process

Releases are cut with `commit-and-tag-version` via the `Release` GitHub Actions
workflow (`releaseAs: patch | minor | major`). Each release:

1. Bumps versions and generates the changelog.
2. Tags and pushes to `main`.
3. The deploy pipeline builds images, runs quality/security gates, publishes
   agent binaries + a GitHub release, and (after the approval gate) updates the
   production Portainer stack with automatic rollback on failure.