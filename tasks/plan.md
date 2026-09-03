# Implementation Plan: Align Feature Gating with Canonical Source of Truth (`featureCatalog.ts`)

## Context & Objectives
Ensure the entire feature gating and entitlement architecture treats `client/src/constants/featureCatalog.ts` as the canonical Source of Truth:
1. Cover all 24 enterprise feature codes.
2. Implement bidirectional bundle decomposition (e.g. `PASSWORD_DARK_WEB` -> `PASSWORD_MANAGER`, `EDR_M365_BACKUP` -> `EDR_SECURITY` + `M365_BACKUP`).
3. Ensure both backend API gating and frontend route/sidebar gating recognize bundle permissions seamlessly.

## Dependency Graph
```
server/src/shared/constants/featureCodes.ts (24 codes + bundle expansions)
   │
   ├── server/src/shared/types/index.ts
   │       │
   │       └── server/src/modules/subscriptions/services/SubscriptionService.ts
   │               │
   │               └── server/src/shared/middleware/requireSubscriptionFeature.ts
   │
client/src/constants/subscriptions.ts (aligned with FEATURE_CATALOG)
   │
   └── client/src/hooks/useEntitlements.ts (bundle expansion)
           │
           ├── client/src/components/shared/FeatureLockedPreview.tsx
           └── client/src/components/layout/app-sidebar.tsx
```
