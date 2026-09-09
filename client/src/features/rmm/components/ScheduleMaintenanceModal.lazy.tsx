import { Suspense, lazy } from 'react';
import type { ComponentProps } from 'react';

const ModalImpl = lazy(() =>
  import('./ScheduleMaintenanceModal').then((m) => ({
    default: m.ScheduleMaintenanceModal,
  })),
);

export function ScheduleMaintenanceModal(
  props: ComponentProps<typeof ModalImpl>,
) {
  return (
    <Suspense fallback={null}>
      <ModalImpl {...props} />
    </Suspense>
  );
}