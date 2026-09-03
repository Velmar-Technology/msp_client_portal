# Implementation Tasks: Align with Canonical Source of Truth (`featureCatalog.ts`)

## Phase 1: Shared Feature Constants & Bundle Expansion Engine
- [x] Task 1.1: Expand `server/src/shared/constants/featureCodes.ts` with all 24 canonical features and `expandFeatureBundles`.
- [x] Task 1.2: Re-export constants in `server/src/shared/types/index.ts`.
- [x] Task 1.3: Update `server/src/modules/subscriptions/services/SubscriptionService.ts` to apply `expandFeatureBundles`.
- [x] Task 1.4: Add unit tests in `SubscriptionService.test.ts` and `requireSubscriptionFeature.test.ts` for bundle decomposition (`PASSWORD_DARK_WEB` -> `PASSWORD_MANAGER`).

## Phase 2: Frontend Entitlement Engine & Catalog Alignment
- [x] Task 2.1: Update `client/src/constants/subscriptions.ts` with all 24 canonical feature codes and `expandFeatureBundles`.
- [x] Task 2.2: Update `client/src/hooks/useEntitlements.ts` to decompose bundle features.
- [x] Task 2.3: Add unit tests in `client/src/hooks/useEntitlements.test.tsx` verifying bundle expansion.
- [x] Task 2.4: Align `FeatureLockedPreview.tsx` with `FEATURE_CATALOG`.

## Phase 3: Verification & Definition of Done
- [x] Checkpoint: Full backend test suite (`npm -w server run test` - 73 suites, 722 tests passed)
- [x] Checkpoint: Full frontend test suite (`npm -w client run test:run`)
- [x] Checkpoint: Clean builds across both workspaces (`npm -w server run build` & `npm -w client run build`)
