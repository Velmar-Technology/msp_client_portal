import { describe, it, expect } from 'vitest';
import { PlansPage } from '@/features/subscriptions';

describe('PlansPage legacy re-export', () => {
  it('exports PlansPage component from gateway', () => {
    expect(PlansPage).toBeDefined();
  });
});
