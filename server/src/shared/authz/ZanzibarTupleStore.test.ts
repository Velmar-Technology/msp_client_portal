import { describe, it, expect, beforeEach } from 'vitest';
import { ZanzibarTupleStore } from './ZanzibarTupleStore';

describe('ZanzibarTupleStore (ReBAC Graph Engine)', () => {
  let store: ZanzibarTupleStore;

  beforeEach(() => {
    store = new ZanzibarTupleStore();
  });

  it('correctly serializes and parses canonical Zanzibar tuple strings', () => {
    const tuple = {
      subject: 'user:usr-1',
      relation: 'assigned_technician',
      object: 'ticket:t-100',
    };

    const formatted = ZanzibarTupleStore.format(tuple);
    expect(formatted).toBe('user:usr-1#assigned_technician@ticket:t-100');

    const parsed = ZanzibarTupleStore.parse(formatted);
    expect(parsed).toEqual(tuple);
  });

  it('throws error when parsing malformed tuple strings', () => {
    expect(() => ZanzibarTupleStore.parse('invalid_string')).toThrow('Invalid Zanzibar relation tuple format');
    expect(() => ZanzibarTupleStore.parse('user:1@object:2#relation')).toThrow('Invalid Zanzibar relation tuple format');
  });

  it('stores and checks direct subject-relation-object tuples', () => {
    store.addTuple({
      subject: 'user:tech-1',
      relation: 'editor',
      object: 'ticket:t-200',
    });

    expect(store.check('user:tech-1', 'editor', 'ticket:t-200')).toBe(true);
    expect(store.check('user:tech-2', 'editor', 'ticket:t-200')).toBe(false);
    expect(store.check('user:tech-1', 'editor', 'ticket:t-201')).toBe(false);
  });

  it('evaluates relation hierarchy inheritance (owner inherits editor and viewer)', () => {
    store.addTuple({
      subject: 'user:client-1',
      relation: 'owner',
      object: 'ticket:t-300',
    });

    // Owner should inherit editor and viewer
    expect(store.check('user:client-1', 'owner', 'ticket:t-300')).toBe(true);
    expect(store.check('user:client-1', 'editor', 'ticket:t-300')).toBe(true);
    expect(store.check('user:client-1', 'viewer', 'ticket:t-300')).toBe(true);
    expect(store.check('user:client-1', 'admin', 'ticket:t-300')).toBe(true);
  });

  it('supports wildcard subject access', () => {
    store.addTuple({
      subject: '*',
      relation: 'viewer',
      object: 'knowledge_base:kb-general',
    });

    expect(store.check('user:usr-999', 'viewer', 'knowledge_base:kb-general')).toBe(true);
  });

  it('lists objects and subjects correctly', () => {
    store.addTuple({ subject: 'user:alice', relation: 'viewer', object: 'ticket:1' });
    store.addTuple({ subject: 'user:alice', relation: 'viewer', object: 'ticket:2' });
    store.addTuple({ subject: 'user:bob', relation: 'viewer', object: 'ticket:1' });

    const aliceTickets = store.listObjects('user:alice', 'viewer', 'ticket');
    expect(aliceTickets).toContain('ticket:1');
    expect(aliceTickets).toContain('ticket:2');

    const ticket1Subjects = store.listSubjects('viewer', 'ticket:1');
    expect(ticket1Subjects).toContain('user:alice');
    expect(ticket1Subjects).toContain('user:bob');
  });

  it('removes tuples properly', () => {
    const tuple = { subject: 'user:bob', relation: 'editor', object: 'ticket:1' };
    store.addTuple(tuple);
    expect(store.check('user:bob', 'editor', 'ticket:1')).toBe(true);

    store.removeTuple(tuple);
    expect(store.check('user:bob', 'editor', 'ticket:1')).toBe(false);
  });
});
