# ADR-002 Enforcement: Paved-Path Feature Creation & Automated AST Guardrails

## Problem Statement
How might we ensure every new frontend capability adheres strictly to the ADR-002 colocated architecture, guarantees zero contract drift, and completely blocks illegal cross-feature coupling at commit and build time without stalling ongoing legacy migrations?

---

## Recommended Direction: "Paved Path + Closed Guardrails"

### 1. Standardized Feature Anatomy (The Paved Path)
Every new business domain under `client/src/features/<domain>/` must implement this canonical vertical slice layout:

```
client/src/features/<domain>/
├── api/
│   ├── use<Domain>Queries.ts   # TanStack Query hooks, query keys & cache invalidation
│   └── <domain>Service.ts      # API client calls strictly typed via @shared/contracts
├── components/
│   ├── <Domain>Table.tsx       # Domain-specific presentation data tables
│   ├── <Domain>Card.tsx        # Domain-specific cards / summary metrics
│   └── <Action>Modal.tsx       # Forms using react-hook-form + zodResolver(@shared/contracts)
├── hooks/
│   ├── use<Domain>Filters.ts   # URL search param synchronization (useUrlState)
│   └── use<Domain>Modals.ts    # Ephemeral UI modal open/close state handlers
├── pages/
│   ├── <Domain>Page.tsx        # Primary route component
│   └── <Domain>DetailPage.tsx  # Detailed single-record route view
├── types.ts                    # ONLY local ephemeral UI state (tabs, step numbers, view toggles)
└── index.ts                    # Public API gateway (exports ONLY public pages, components, & hooks)
```

### 2. Automated AST Enforcement Rules (The Guardrails)
Integrate strict invariants into `client/eslint.config.js`:

1. **Ban Cross-Feature Deep Imports Repository-Wide:**
   * Target: `src/**/*.{ts,tsx}`.
   * Pattern: Prohibit `@/features/*/*` and relative paths into peer feature internals.
   * Self-Exception: Allow a feature (`src/features/<name>/**`) to access its own internal folders via relative paths (`./components/`, `../api/`).
   * Violation Message: *"ADR-002 Violation: Deep imports into feature internals are prohibited. Import exclusively through '@/features/<domain>'."*

2. **Single Contract Truth Invariant (`types.ts`):**
   * Target: `src/features/**/types.ts` and `src/features/**/*.types.ts`.
   * Rule: Disallow type/interface declarations containing names or suffixes associated with backend entities (`*Input`, `*Response`, `*Contract`, `*Payload`, `*Filter`, `*DTO`, `*Record`, `*Entity`).
   * Violation Message: *"ADR-002 Invariant: Do not declare backend entity types in feature types.ts. Import entity contracts directly from '@shared/contracts'."*

3. **Public Gateway Requirement (`index.ts`):**
   * Every domain folder in `client/src/features/` must supply an `index.ts` public barrel file.

4. **Interactive Feature Scaffolding Engine:**
   * Provide `npm -w client run gen:feature <name>` to stamp out complete, compliant feature skeletons with zero cognitive overhead or boilerplate typos.

---

## Key Assumptions to Validate
- [ ] ESLint Flat Config AST selectors can cleanly differentiate a feature importing its own submodules from peer-feature deep imports.
- [ ] Developers and AI agents can rapidly scaffold new vertical slices using `npm -w client run gen:feature <name>`.
- [ ] Existing grandfathered legacy code (`client/src/components/*` and `client/src/pages/*`) continues to build cleanly without regression.

---

## MVP Scope
1. **ESLint Boundary Rules:** Close deep import loopholes across `client/eslint.config.js` and extend AST selectors to ban entity duplications in `features/**/types.ts`.
2. **Architecture Test Suite:** Create `client/tests/arch/feature-architecture.test.ts` to assert that every feature contains a public gateway `index.ts` and zero unauthorized exports.
3. **Scaffolding CLI:** Implement `client/scripts/gen-feature.mjs` wired to `npm -w client run gen:feature`.
4. **Canonical Documentation:** Update `docs/architecture/feature-slice-recipe.md` with the comprehensive recipe and generator instructions.

---

## Not Doing (and Why)
- **Not installing heavyweight external graph linters (dependency-cruiser):** ESLint flat config AST rules and Vitest architecture tests execute natively in <1s with zero additional dependencies.
- **Not doing a big-bang rewrite of grandfathered legacy folders:** Allows ongoing planned horizontal migrations to progress safely without regressions.
- **Not permitting `@ts-ignore` or lint suppression on entity declarations:** Absolute zero tolerance for local entity re-declaration.
