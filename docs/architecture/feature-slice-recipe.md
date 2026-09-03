# Canonical Feature Slice Recipe (Contract-First Monolith)

This document defines the standard, high-velocity engineering recipe for adding or refactoring features in the `msp_client_portal` repository. It is designed to prevent cross-layer drift, eliminate boilerplate, and stop reinventing the wheel.

---

## The 4-Step Vertical Slice Workflow

```
[ Step 1: @shared/contracts ]
        │  Define input/output Zod schemas once
        ▼
[ Step 2: Express Route & Service ]
        │  Validate with contract schema, execute query in Service
        ▼
[ Step 3: TanStack Query Hook ]
        │  useQuery / useMutation with cache invalidation
        ▼
[ Step 4: React UI Component ]
           Consume typed data with zero manual loading/error boilerplate
```

---

### Step 1: Define the Contract in `@shared/contracts`

Always start by defining input and response schemas in `packages/contracts/src/<module>/<module>.contract.ts`.

```typescript
// packages/contracts/src/devices/devices.contract.ts
import { z } from 'zod';

export const RegisterDeviceInputSchema = z.object({
  deviceName: z.string().min(3).max(100),
  slotIndex: z.number().int().min(0),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address'),
});

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceInputSchema>;

export const DeviceResponseSchema = z.object({
  id: z.string().uuid(),
  deviceName: z.string(),
  status: z.enum(['ACTIVE', 'PENDING_ACTIVATION', 'DECOMMISSIONED']),
  createdAt: z.string(),
});

export type DeviceContract = z.infer<typeof DeviceResponseSchema>;
```

Export your contract in `packages/contracts/src/index.ts` and build packages:
```bash
npm run build:packages
```

---

### Step 2: Server Route Validation & Pragmatic Service

Attach the shared Zod schema directly to your Express route with `validate()`:

```typescript
// server/src/modules/devices/routes/device.routes.ts
import { Router } from 'express';
import { validate } from '@shared/middleware/validationMiddleware';
import { RegisterDeviceInputSchema } from '@shared/contracts';
import { deviceController } from '../controllers/DeviceController';

const router = Router();

router.post('/', validate(RegisterDeviceInputSchema), (req, res) => deviceController.register(req, res));

export default router;
```

#### Pragmatic Service Guidelines: When do you need a Repository?
* **Direct Drizzle in Domain Service (Preferred for 90% of features):** For straightforward inserts, updates, and relational lookups (`db.query.devices.findMany({ with: { user: true } })`), query Drizzle directly inside the Domain Service. Do not create an empty 1-line wrapper class.
* **Dedicated Repository (Only when justified):** Use a custom repository only when you have complex raw SQL, window functions, recursive CTEs, or complex multi-table transactional batching.

---

### Step 3: Frontend Colocated Feature Module (`client/src/features/<feature>/`)

Per [ADR-002](../decisions/ADR-002-frontend-colocated-feature-architecture.md), colocate your query hooks, services, tables, dialogs, and route pages inside `client/src/features/<feature>/`:

```
client/src/features/devices/
├── api/
│   ├── useDevices.ts          # TanStack Query hooks, query keys & mutations
│   └── deviceService.ts       # Axios client service
├── components/
│   ├── DeviceTable.tsx        # Domain-specific data table
│   └── RegisterDeviceModal.tsx# Domain-specific form dialog
├── hooks/
│   └── useDeviceFilters.ts    # URL sync (useUrlState)
├── pages/
│   └── DevicesPage.tsx        # Top-level route component
├── types.ts                   # ONLY local ephemeral UI state types (no duplicate entity types!)
└── index.ts                   # Public API gateway
```

#### Query Hook Implementation (`features/devices/api/useDevices.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceService } from './deviceService';
import type { RegisterDeviceInput } from '@shared/contracts';

export const DEVICE_QUERY_KEYS = {
  all: ['devices'] as const,
  lists: () => [...DEVICE_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...DEVICE_QUERY_KEYS.all, 'detail', id] as const,
};

export function useDevices() {
  return useQuery({
    queryKey: DEVICE_QUERY_KEYS.lists(),
    queryFn: () => deviceService.getAll(),
  });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterDeviceInput) => deviceService.register(data),
    onSuccess: () => {
      // Automatically invalidates cache; UI updates without manual re-fetch loops
      queryClient.invalidateQueries({ queryKey: DEVICE_QUERY_KEYS.lists() });
    },
  });
}
```

---

### Step 4: React UI Component & Route Page

In your component, consume the query hook directly. Form mutations validate using `zodResolver` with schemas imported straight from `@shared/contracts`:

```tsx
// client/src/features/devices/pages/DevicesPage.tsx
import { useDevices, useRegisterDevice } from '../api/useDevices';
import { DeviceTable } from '../components/DeviceTable';
import { TablePageSkeleton } from '@/components/shared/TablePageSkeleton';
import type { RegisterDeviceInput } from '@shared/contracts';

export function DevicesPage() {
  const { data: devices, isLoading, error } = useDevices();
  const registerDevice = useRegisterDevice();

  if (isLoading) return <TablePageSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

  const handleCreate = async (formData: RegisterDeviceInput) => {
    await registerDevice.mutateAsync(formData);
    // Table is already fresh! Zero manual state tracking required.
  };

  return <DeviceTable data={devices} onCreate={handleCreate} />;
}
```

---

## Summary of Golden Rules
1. **Never write manual response types in frontend:** Import entity contracts directly from `@shared/contracts`.
2. **Never duplicate Zod schemas:** Define once in `@shared/contracts` and consume in both Express route validators and React Hook Form `zodResolver`.
3. **Colocate feature files (`client/src/features/<feature>/`):** Keep api hooks, tables, modals, and pages together for a given business domain.
4. **Keep Zustand for client UI only:** Modals, drawers, and theme preferences live in Zustand. Server cache data lives in TanStack Query.
5. **URL is the single source of truth for navigation:** Filters, pagination, tabs, and drawer inspection IDs sync via `useUrlState`.
6. **Avoid 1-line pass-through repositories:** Keep domain logic and straightforward queries together in domain services.
