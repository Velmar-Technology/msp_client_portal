import { UserRole } from '@shared/types';
import {
  AuthzSubject,
  DocumentAccessLevel,
  DocumentChunkAcl,
  VectorAclFilter,
} from './types';

/**
 * Service providing Document-Level Access Control for Vector Databases and AI/RAG Pipelines.
 * Enforces dual-phase authorization:
 * 1. Pre-retrieval SQL/Metadata filter generation to constrain database searches.
 * 2. Post-retrieval PDP verification before context injection into LLM prompts.
 */
export class VectorAclService {
  /**
   * Access level hierarchy index (higher index requires higher privilege).
   */
  private levelHierarchy: Record<DocumentAccessLevel, number> = {
    PUBLIC: 0,
    INTERNAL: 1,
    CONFIDENTIAL: 2,
    RESTRICTED: 3,
  };

  /**
   * Generates dual-phase vector search filter expressions (SQL & JSON metadata)
   * tailored to the querying subject's tenant and role.
   *
   * @param subject - The authenticated user or agent initiating RAG retrieval
   * @param maxLevel - Optional maximum classification tier allowed
   * @returns VectorAclFilter containing SQL and JSON metadata expressions
   */
  buildVectorAclFilter(
    subject: AuthzSubject,
    maxLevel: DocumentAccessLevel = 'CONFIDENTIAL',
  ): VectorAclFilter {
    // Global Admins have universal visibility across all tenants
    if (subject.role === UserRole.ADMIN) {
      return {
        sqlWhereClause: '1 = 1',
        sqlParams: {},
        metadataFilter: {},
      };
    }

    const tenantId = subject.tenantId || '';
    const userId = subject.id;
    const role = subject.role;

    // Determine permitted access levels for this subject
    const permittedLevels = this.getPermittedLevels(subject, maxLevel);

    // Build parameterized SQL / pgvector WHERE clause
    const sqlWhereClause = `
      (tenant_id = :tenantId OR tenant_id IS NULL)
      AND (
        allowed_roles @> ARRAY[:userRole]::text[]
        OR :userId = ANY(allowed_subject_ids)
        OR allowed_roles @> ARRAY['ALL']::text[]
      )
      AND access_level = ANY(:permittedLevels)
    `.trim().replace(/\s+/g, ' ');

    const sqlParams = {
      tenantId,
      userId,
      userRole: role,
      permittedLevels,
    };

    // Build JSON metadata filter representation for NoSQL / Cloud Vector Stores (e.g. Pinecone/Qdrant)
    const metadataFilter = {
      $and: [
        {
          $or: [
            { tenant_id: { $eq: tenantId } },
            { tenant_id: { $exists: false } },
          ],
        },
        {
          $or: [
            { allowed_roles: { $in: [role, 'ALL'] } },
            { allowed_subject_ids: { $in: [userId] } },
          ],
        },
        {
          access_level: { $in: permittedLevels },
        },
      ],
    };

    return {
      sqlWhereClause,
      sqlParams,
      metadataFilter,
    };
  }

  /**
   * Post-retrieval PDP verification: Re-checks retrieved vector chunks before prompt injection.
   * Eliminates data leakage caused by fuzzy vector matching or cache drift.
   *
   * @param chunks - Raw candidate chunks returned by vector similarity search
   * @param subject - Authenticated user context
   * @returns Sanitized array of authorized document chunks
   */
  verifyRetrievedChunks(
    chunks: DocumentChunkAcl[],
    subject: AuthzSubject,
  ): DocumentChunkAcl[] {
    if (subject.role === UserRole.ADMIN) {
      return chunks;
    }

    return chunks.filter((chunk) => {
      // 1. Tenant boundary assertion
      if (chunk.tenantId && subject.tenantId && chunk.tenantId !== subject.tenantId) {
        return false;
      }

      // 2. Direct subject whitelisting
      if (chunk.allowedSubjectIds && chunk.allowedSubjectIds.includes(subject.id)) {
        return true;
      }

      // 3. Role-based entitlement check
      if (!chunk.allowedRoles.includes(subject.role)) {
        return false;
      }

      // 4. Access level classification check
      if (chunk.accessLevel === 'RESTRICTED' && subject.role !== UserRole.ADMIN) {
        return false;
      }

      if (
        chunk.accessLevel === 'CONFIDENTIAL' &&
        subject.role === UserRole.CLIENT
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Creates an authorized DocumentChunkAcl descriptor for indexation.
   */
  tagDocumentChunk(
    documentId: string,
    chunkId: string,
    tenantId: string,
    allowedRoles: UserRole[],
    accessLevel: DocumentAccessLevel = 'INTERNAL',
    allowedSubjectIds?: string[],
  ): DocumentChunkAcl {
    return {
      documentId,
      chunkId,
      tenantId,
      allowedRoles,
      accessLevel,
      allowedSubjectIds,
    };
  }

  /**
   * Evaluates permitted document access levels based on subject role.
   */
  private getPermittedLevels(
    subject: AuthzSubject,
    maxLevel: DocumentAccessLevel,
  ): DocumentAccessLevel[] {
    const maxScore = this.levelHierarchy[maxLevel] ?? 2;
    const allLevels: DocumentAccessLevel[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

    return allLevels.filter((lvl) => {
      const score = this.levelHierarchy[lvl];
      if (score > maxScore) return false;

      // Role tier limits
      if (subject.role === UserRole.CLIENT) {
        return score <= this.levelHierarchy.INTERNAL;
      }
      if (subject.role === UserRole.TECHNICIAN) {
        return score <= this.levelHierarchy.CONFIDENTIAL;
      }
      return true;
    });
  }
}

export const vectorAclService = new VectorAclService();
