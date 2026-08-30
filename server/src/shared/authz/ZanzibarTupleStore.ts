import { RelationTuple } from './types';

/**
 * In-memory Zanzibar Relationship Graph Store.
 * Evaluates fine-grained Subject-Relation-Object graph edges with relation inheritance.
 *
 * Pattern: `<subject>#<relation>@<object>` (e.g. `user:101#owner@ticket:501`)
 */
export class ZanzibarTupleStore {
  private tuples = new Set<string>();

  /**
   * Relation inheritance graph:
   * A subject holding a key relation automatically inherits all values in the array.
   */
  private relationHierarchy: Record<string, string[]> = {
    owner: ['admin', 'editor', 'viewer', 'assigned_technician'],
    admin: ['editor', 'viewer', 'approver'],
    editor: ['viewer', 'contributor'],
    assigned_technician: ['editor', 'viewer'],
    lead_technician: ['assigned_technician', 'editor', 'viewer', 'approver'],
    tenant_admin: ['tenant_member', 'admin', 'viewer'],
    tenant_member: ['viewer'],
  };

  /**
   * Serializes a RelationTuple object into canonical Zanzibar string format.
   *
   * @param tuple - The relation tuple object
   * @returns Formatted canonical string
   */
  static format(tuple: RelationTuple): string {
    return `${tuple.subject}#${tuple.relation}@${tuple.object}`;
  }

  /**
   * Parses a canonical Zanzibar string into a RelationTuple object.
   *
   * @param tupleStr - Canonical string format `<subject>#<relation>@<object>`
   * @returns Parsed RelationTuple
   */
  static parse(tupleStr: string): RelationTuple {
    const hashIndex = tupleStr.indexOf('#');
    const atIndex = tupleStr.indexOf('@');

    if (hashIndex === -1 || atIndex === -1 || atIndex < hashIndex) {
      throw new Error(`Invalid Zanzibar relation tuple format: "${tupleStr}"`);
    }

    const subject = tupleStr.substring(0, hashIndex);
    const relation = tupleStr.substring(hashIndex + 1, atIndex);
    const object = tupleStr.substring(atIndex + 1);

    return { subject, relation, object };
  }

  /**
   * Registers a new relationship edge in the graph.
   *
   * @param tuple - Target relation tuple to store
   */
  addTuple(tuple: RelationTuple): void {
    this.tuples.add(ZanzibarTupleStore.format(tuple));
  }

  /**
   * Removes a relationship edge from the graph.
   *
   * @param tuple - Target relation tuple to remove
   */
  removeTuple(tuple: RelationTuple): void {
    this.tuples.delete(ZanzibarTupleStore.format(tuple));
  }

  /**
   * Clears all stored tuples.
   */
  clear(): void {
    this.tuples.clear();
  }

  /**
   * Returns total count of active tuples.
   */
  size(): number {
    return this.tuples.size;
  }

  /**
   * Checks if a subject has the requested relation to an object,
   * evaluating direct matches and relation hierarchy expansions.
   *
   * @param subject - Subject identifier (e.g. `user:usr-1`)
   * @param targetRelation - Desired relation (e.g. `viewer`)
   * @param object - Resource identifier (e.g. `ticket:t-101`)
   * @returns True if the relationship graph confirms access
   */
  check(subject: string, targetRelation: string, object: string): boolean {
    // 1. Direct match check
    const directKey = `${subject}#${targetRelation}@${object}`;
    if (this.tuples.has(directKey)) {
      return true;
    }

    // 2. Wildcard subject check (e.g. `*` or `tenant:tenant-1#member`)
    const wildcardKey = `*#${targetRelation}@${object}`;
    if (this.tuples.has(wildcardKey)) {
      return true;
    }

    // 3. Hierarchical relation expansion
    for (const [parentRelation, children] of Object.entries(this.relationHierarchy)) {
      if (children.includes(targetRelation)) {
        const parentKey = `${subject}#${parentRelation}@${object}`;
        if (this.tuples.has(parentKey)) {
          return true;
        }
      }
    }

    // 4. Nested container / tenant inheritance check (e.g. object belongs to a tenant)
    // If subject is tenant_admin or member on tenant:X, and object is scoped to tenant:X
    for (const tupleStr of this.tuples) {
      if (tupleStr.startsWith(`${subject}#`)) {
        const parsed = ZanzibarTupleStore.parse(tupleStr);
        if (parsed.object.startsWith('tenant:') && object.includes(parsed.object)) {
          if (
            parsed.relation === targetRelation ||
            (this.relationHierarchy[parsed.relation] &&
              this.relationHierarchy[parsed.relation].includes(targetRelation))
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Lists all objects of a given type that a subject has a relation to.
   *
   * @param subject - Subject identifier
   * @param relation - Target relation
   * @param objectType - Object namespace prefix (e.g. `ticket`)
   * @returns Array of matching object IDs
   */
  listObjects(subject: string, relation: string, objectType: string): string[] {
    const matchedObjects = new Set<string>();
    const prefix = `${objectType}:`;

    for (const tupleStr of this.tuples) {
      const tuple = ZanzibarTupleStore.parse(tupleStr);
      if (tuple.object.startsWith(prefix) && this.check(subject, relation, tuple.object)) {
        matchedObjects.add(tuple.object);
      }
    }

    return Array.from(matchedObjects);
  }

  /**
   * Lists all subjects that hold a specific relation to an object.
   *
   * @param relation - Target relation
   * @param object - Resource identifier
   * @returns Array of subject identifiers
   */
  listSubjects(relation: string, object: string): string[] {
    const subjects = new Set<string>();

    for (const tupleStr of this.tuples) {
      const tuple = ZanzibarTupleStore.parse(tupleStr);
      if (tuple.object === object && this.check(tuple.subject, relation, object)) {
        subjects.add(tuple.subject);
      }
    }

    return Array.from(subjects);
  }
}

export const zanzibarStore = new ZanzibarTupleStore();
