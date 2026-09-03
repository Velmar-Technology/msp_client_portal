# Idea Refine: Sub-Second Server Build Pipeline & Typecheck Decoupling

## Problem Statement
**How might we** eliminate the 15+ minute backend build hang (`tsc -p tsconfig.build.json && tsc-alias`) and reduce production build times to under 1 second while maintaining strict TypeScript safety and zero deployment regressions?

---

## Recommended Direction
**Decouple Emit from Typechecking via `tsup` / `esbuild` + Incremental `tsc --noEmit`**

1. **Modern High-Speed Bundling (`tsup`):**
   Replace `tsc + tsc-alias` in the `build` script with `tsup` (esbuild-powered). `tsup` resolves path aliases (`@/*`, `@shared/*`, `@modules/*`, `@shared/contracts`) instantly at bundle-time in **~300-500ms**, generating a clean `dist/index.js` ready for Docker/production without running out of memory.
2. **Dedicated Fast Typechecking (`npm run typecheck`):**
   Separate type validation into `tsc -p tsconfig.build.json --noEmit --incremental` with `.tsbuildinfo` cache persistence. Typechecking runs concurrently in CI or git pre-push hooks without blocking container image creation or rapid local builds.
3. **Decommission `tsc-alias` & Remove 8GB Heap Workaround:**
   Eliminate `tsc-alias` (the primary culprit performing recursive regex/AST file system scans and causing memory exhaustion) and drop `--max-old-space-size=8192`.

---

## Key Assumptions to Validate
- [ ] **Runtime Compatibility:** Validate that all external dependencies (`bcrypt`, `pg`, `drizzle-orm`, `pdfkit`, `ws`) execute cleanly when bundled/transpiled by `tsup` to `dist/index.js` in Node.js 22.
- [ ] **Path Resolution:** Verify that internal monorepo package imports (`@shared/contracts`, `@shared/errors`) and local aliases (`@/*`, `@shared/*`, `@modules/*`) resolve properly without runtime `MODULE_NOT_FOUND` errors.
- [ ] **Clean Architecture Compliance:** Ensure build scripts in root `package.json` (`npm -w server run build` and `npm -w server run typecheck`) integrate seamlessly with CI and the monorepo orchestration standard.

---

## MVP Scope

### What's In:
- Add `tsup` to `server/package.json` devDependencies.
- Configure `server/tsup.config.ts` (target: Node 22, format: ESM/CJS matching server main, bundle path aliases, externalize node_modules).
- Update `server/package.json` scripts:
  - `"build": "tsup"`
  - `"typecheck": "tsc -p tsconfig.build.json --noEmit --incremental"`
- Add `.tsbuildinfo` to `.gitignore`.
- Remove `--max-old-space-size=8192` and `tsc-alias` from build pipeline.
- Verify `npm -w server run build` takes **< 1.5s** and `node dist/index.js` boots cleanly.

### What's Out (Not Doing & Why):
- **Not rewriting the entire monorepo to Turborepo / Nx right now:** Avoid unnecessary infrastructure churn when the immediate bottleneck is isolated to the server compilation step.
- **Not converting the backend to runtime `tsx` in production:** Container deployments require predictable static bundles (`dist/index.js`) for minimal startup latency and lower memory footprints.
- **Not modifying domain business logic or Drizzle schemas:** Keep the refactor strictly at the build/bundling layer to ensure zero behavioral risk.

---

## Open Questions
1. Do you prefer `tsup` outputting standard ESM (`dist/index.js` with `"type": "module"`) or CommonJS (`dist/index.cjs`/`dist/index.js`) matching your current container runner?
2. Should we proceed directly with drafting the implementation plan and executing this upgrade?
