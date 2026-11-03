import { describe, it, expect } from 'vitest';
import {
  CreateKbInputSchema,
  UpdateKbInputSchema,
} from './kb.contract';

describe('Kb Contract Schemas', () => {
  it('validates a valid CreateKbInput payload', () => {
    const parsed = CreateKbInputSchema.parse({
      name: 'Sample Kb',
    });
    expect(parsed.name).toBe('Sample Kb');
    expect(parsed.status).toBe('ACTIVE');
  });

  it('rejects empty name in CreateKbInputSchema', () => {
    expect(() => CreateKbInputSchema.parse({ name: '' })).toThrow();
  });

  it('allows partial updates in UpdateKbInputSchema', () => {
    const parsed = UpdateKbInputSchema.parse({ status: 'ARCHIVED' });
    expect(parsed.status).toBe('ARCHIVED');
  });
});
