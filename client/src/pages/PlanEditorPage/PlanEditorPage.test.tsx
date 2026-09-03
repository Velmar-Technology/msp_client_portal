import { describe, it, expect } from 'vitest';
import { PlanEditorPage } from '@/features/subscriptions';

describe('PlanEditorPage legacy re-export', () => {
  it('exports PlanEditorPage component from gateway', () => {
    expect(PlanEditorPage).toBeDefined();
  });
});
