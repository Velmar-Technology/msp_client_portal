import { describe, it, expect, beforeEach } from 'vitest';
import { VectorAclService } from './VectorAclService';
import { UserRole } from '@shared/types';
import { AuthzSubject, DocumentChunkAcl } from './types';

describe('VectorAclService (AI / RAG Document-Level Security)', () => {
  let service: VectorAclService;

  beforeEach(() => {
    service = new VectorAclService();
  });

  describe('buildVectorAclFilter', () => {
    it('generates universal 1=1 filter for ADMIN users', () => {
      const adminSubject: AuthzSubject = {
        id: 'admin-1',
        type: 'user',
        role: UserRole.ADMIN,
      };

      const filter = service.buildVectorAclFilter(adminSubject);
      expect(filter.sqlWhereClause).toBe('1 = 1');
      expect(filter.sqlParams).toEqual({});
      expect(filter.metadataFilter).toEqual({});
    });

    it('generates tenant and role-scoped SQL and JSON metadata filters for CLIENT users', () => {
      const clientSubject: AuthzSubject = {
        id: 'client-1',
        type: 'user',
        role: UserRole.CLIENT,
        tenantId: 'tenant-abc',
      };

      const filter = service.buildVectorAclFilter(clientSubject);

      expect(filter.sqlWhereClause).toContain('tenant_id = :tenantId');
      expect(filter.sqlWhereClause).toContain('allowed_roles @> ARRAY[:userRole]::text[]');
      expect(filter.sqlParams.tenantId).toBe('tenant-abc');
      expect(filter.sqlParams.userRole).toBe(UserRole.CLIENT);
      expect(filter.sqlParams.permittedLevels).toContain('PUBLIC');
      expect(filter.sqlParams.permittedLevels).toContain('INTERNAL');
      expect(filter.sqlParams.permittedLevels).not.toContain('CONFIDENTIAL');

      expect(filter.metadataFilter).toHaveProperty('$and');
    });

    it('includes CONFIDENTIAL access level for TECHNICIAN users', () => {
      const techSubject: AuthzSubject = {
        id: 'tech-1',
        type: 'user',
        role: UserRole.TECHNICIAN,
        tenantId: 'msp-internal',
      };

      const filter = service.buildVectorAclFilter(techSubject);
      expect(filter.sqlParams.permittedLevels).toContain('CONFIDENTIAL');
      expect(filter.sqlParams.permittedLevels).not.toContain('RESTRICTED');
    });
  });

  describe('verifyRetrievedChunks (Post-Retrieval PDP Verification)', () => {
    const mockChunks: DocumentChunkAcl[] = [
      {
        chunkId: 'chunk-1',
        documentId: 'doc-1',
        tenantId: 'tenant-A',
        allowedRoles: [UserRole.CLIENT, UserRole.TECHNICIAN, UserRole.ADMIN],
        accessLevel: 'INTERNAL',
      },
      {
        chunkId: 'chunk-2',
        documentId: 'doc-2',
        tenantId: 'tenant-B',
        allowedRoles: [UserRole.CLIENT],
        accessLevel: 'INTERNAL',
      },
      {
        chunkId: 'chunk-3',
        documentId: 'doc-3',
        tenantId: 'tenant-A',
        allowedRoles: [UserRole.TECHNICIAN, UserRole.ADMIN],
        accessLevel: 'CONFIDENTIAL',
      },
      {
        chunkId: 'chunk-4',
        documentId: 'doc-4',
        tenantId: 'tenant-A',
        allowedRoles: [UserRole.CLIENT],
        accessLevel: 'RESTRICTED',
      },
    ];

    it('filters out chunks from other tenants and beyond role permission', () => {
      const clientSubject: AuthzSubject = {
        id: 'client-1',
        type: 'user',
        role: UserRole.CLIENT,
        tenantId: 'tenant-A',
      };

      const verified = service.verifyRetrievedChunks(mockChunks, clientSubject);
      const verifiedChunkIds = verified.map((c) => c.chunkId);

      expect(verifiedChunkIds).toContain('chunk-1');
      expect(verifiedChunkIds).not.toContain('chunk-2'); // Cross-tenant
      expect(verifiedChunkIds).not.toContain('chunk-3'); // Role mismatch / confidential
      expect(verifiedChunkIds).not.toContain('chunk-4'); // Restricted
    });

    it('allows explicitly whitelisted subject IDs even if role differs', () => {
      const specialChunk: DocumentChunkAcl = {
        chunkId: 'chunk-special',
        documentId: 'doc-special',
        tenantId: 'tenant-A',
        allowedRoles: [UserRole.ADMIN],
        allowedSubjectIds: ['client-vip'],
        accessLevel: 'INTERNAL',
      };

      const clientVip: AuthzSubject = {
        id: 'client-vip',
        type: 'user',
        role: UserRole.CLIENT,
        tenantId: 'tenant-A',
      };

      const verified = service.verifyRetrievedChunks([specialChunk], clientVip);
      expect(verified.length).toBe(1);
    });
  });
});
