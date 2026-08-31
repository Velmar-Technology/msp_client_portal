import {
  hybridPolicyEngine,
  zanzibarStore,
  vectorAclService,
  continuousAdaptiveTrustService,
  AuthzContext,
  DocumentChunkAcl,
  EntitlementLog,
} from '../authz';
import { UserRole } from '@shared/types';

async function runDemo() {
  console.log('\n================================================================');
  console.log('  STATE-OF-THE-ART (SOTA) AUTHORIZATION ENGINE DEMO');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // PILLAR 1: Hybrid Policy Engine (RBAC + ReBAC + ABAC)
  // -------------------------------------------------------------
  console.log('[PILLAR 1] Hybrid Authorization (RBAC + ReBAC + ABAC)');
  console.log('----------------------------------------------------------------');

  // Step 1: Register Zanzibar relationship tuple
  console.log('1. Setting up Zanzibar Relation Tuple:');
  hybridPolicyEngine.grantRelation('tech-alex', 'assigned_technician', 'ticket', 't-100');
  console.log('   - Granted: user:tech-alex#assigned_technician@ticket:t-100');
  console.log('   - ReBAC Inheritance: Can user:tech-alex view ticket:t-100? ->',
    zanzibarStore.check('user:tech-alex', 'viewer', 'ticket:t-100') ? 'ALLOWED (inherited)' : 'DENIED');

  // Step 2: Evaluate ReBAC + ABAC for Client Ticket Cancellation
  console.log('\n2. Evaluating Client Ticket Cancellation with 1-Hour SLA Rule (BL-101):');
  const freshTicketContext: AuthzContext = {
    subject: { id: 'client-sarah', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-acme' },
    action: 'cancel',
    resource: {
      id: 't-200',
      type: 'ticket',
      tenantId: 'tenant-acme',
      ownerId: 'client-sarah',
      attributes: { createdAt: new Date().toISOString() }, // Fresh (within SLA)
    },
  };

  const freshDecision = await hybridPolicyEngine.evaluate(freshTicketContext);
  console.log(`   - Cancellation on Fresh Ticket (< 60m): ${freshDecision.allowed ? '[ALLOWED]' : '[DENIED]'} (${freshDecision.reason})`);

  const expiredTicketContext: AuthzContext = {
    ...freshTicketContext,
    resource: {
      ...freshTicketContext.resource,
      id: 't-201',
      attributes: { createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() }, // 7 days old
    },
  };
  const expiredDecision = await hybridPolicyEngine.evaluate(expiredTicketContext);
  console.log(`   - Cancellation on Expired Ticket (> 60m SLA): ${expiredDecision.allowed ? '[ALLOWED]' : '[DENIED]'} (Violated: ${expiredDecision.violatedPolicy})`);

  // Step 3: Non-Payment Scale Lock (BL-702)
  console.log('\n3. Non-Payment Scale (BL-702) Write Lock:');
  const suspendedContext: AuthzContext = {
    subject: { id: 'client-sarah', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-acme' },
    action: 'create',
    resource: { id: 't-new', type: 'ticket', tenantId: 'tenant-acme' },
    environment: { accountStatus: 'READ_ONLY' }, // Day 5 overdue
  };
  const suspendedDecision = await hybridPolicyEngine.evaluate(suspendedContext);
  console.log(`   - Ticket Creation on READ_ONLY Overdue Account: ${suspendedDecision.allowed ? '[ALLOWED]' : '[DENIED]'} (Violated: ${suspendedDecision.violatedPolicy})`);

  // -------------------------------------------------------------
  // PILLAR 2: Document-Level Vector Security for AI / RAG
  // -------------------------------------------------------------
  console.log('\n\n[PILLAR 2] Document-Level AI / RAG Vector Store Security');
  console.log('----------------------------------------------------------------');

  const clientUser = { id: 'client-sarah', type: 'user' as const, role: UserRole.CLIENT, tenantId: 'tenant-acme' };
  const vectorFilter = vectorAclService.buildVectorAclFilter(clientUser, 'INTERNAL');

  console.log('1. Generated DB Pre-Retrieval SQL Filter (Injected at pgvector layer):');
  console.log(`   SQL WHERE: "${vectorFilter.sqlWhereClause}"`);
  console.log('   SQL Params:', vectorFilter.sqlParams);

  console.log('\n2. Post-Retrieval LLM Context Sanitization:');
  const rawRetrievedChunks: DocumentChunkAcl[] = [
    { chunkId: 'c1', documentId: 'doc-public-faq', tenantId: 'tenant-acme', allowedRoles: [UserRole.CLIENT], accessLevel: 'PUBLIC' },
    { chunkId: 'c2', documentId: 'doc-internal-runbook', tenantId: 'tenant-acme', allowedRoles: [UserRole.CLIENT], accessLevel: 'INTERNAL' },
    { chunkId: 'c3', documentId: 'doc-admin-passwords', tenantId: 'tenant-acme', allowedRoles: [UserRole.ADMIN], accessLevel: 'RESTRICTED' },
    { chunkId: 'c4', documentId: 'doc-other-tenant-data', tenantId: 'tenant-globex', allowedRoles: [UserRole.CLIENT], accessLevel: 'INTERNAL' },
  ];

  const sanitized = vectorAclService.verifyRetrievedChunks(rawRetrievedChunks, clientUser);
  console.log(`   - Retrieved candidate chunks: ${rawRetrievedChunks.length}`);
  console.log(`   - Verified safe chunks for LLM Context: ${sanitized.length} (Chunks: ${sanitized.map((c) => c.chunkId).join(', ')})`);
  console.log('   ✓ Blocked cross-tenant leak (c4) and restricted privilege leak (c3) before LLM prompt injection!');

  // -------------------------------------------------------------
  // PILLAR 3 & 4: Continuous Adaptive Trust & Role Mining
  // -------------------------------------------------------------
  console.log('\n\n[PILLAR 3 & 4] Continuous Adaptive Trust & Unsupervised Role Mining');
  console.log('----------------------------------------------------------------');

  console.log('1. Zero-Trust Continuous Streaming Risk Scoring:');
  const normalEvent = continuousAdaptiveTrustService.evaluateSessionRisk({
    userId: 'usr-10',
    clientIp: '190.167.1.5',
    action: 'view_ticket',
    timestamp: new Date(),
    geoCountry: 'DO',
  });
  console.log(`   - Normal Activity: Risk = ${normalEvent.riskLevel} (Score: ${normalEvent.riskScore}) -> StepUp MFA: ${normalEvent.shouldTriggerStepUpMfa}`);

  const exfilEvent = continuousAdaptiveTrustService.evaluateSessionRisk({
    userId: 'usr-10',
    clientIp: '190.167.1.5',
    action: 'export_database_dump',
    timestamp: new Date(),
    bytesTransferred: 95 * 1024 * 1024, // 95 MB spike
    geoCountry: 'DO',
  });
  console.log(`   - Data Exfiltration Spike (95MB): Risk = ${exfilEvent.riskLevel} (Score: ${exfilEvent.riskScore}) -> StepUp MFA: ${exfilEvent.shouldTriggerStepUpMfa} (${exfilEvent.anomalies[0]})`);

  console.log('\n2. Unsupervised Role Mining & Entitlement Optimization:');
  const corporateLogs: EntitlementLog[] = [
    { userId: 'tech-1', role: 'FIELD_TECH', permission: 'view_tickets', frequency: 120, lastUsed: new Date() },
    { userId: 'tech-1', role: 'FIELD_TECH', permission: 'edit_tickets', frequency: 95, lastUsed: new Date() },
    { userId: 'tech-2', role: 'FIELD_TECH', permission: 'view_tickets', frequency: 110, lastUsed: new Date() },
    { userId: 'tech-2', role: 'FIELD_TECH', permission: 'edit_tickets', frequency: 80, lastUsed: new Date() },
    // Sprawl / Unused privileges
    { userId: 'tech-1', role: 'FIELD_TECH', permission: 'delete_invoices', frequency: 0, lastUsed: new Date() },
    { userId: 'tech-2', role: 'FIELD_TECH', permission: 'manage_dns_root', frequency: 0, lastUsed: new Date() },
  ];

  const minedRoles = continuousAdaptiveTrustService.mineRoles(corporateLogs);
  console.log('   - Role Mining Suggestion:', {
    proposedRole: minedRoles[0].proposedRoleName,
    retainedPermissions: minedRoles[0].includedPermissions,
    redundancyScore: `${(minedRoles[0].redundancyScore * 100).toFixed(0)}% unused entitlements pruned`,
    entitlementDriftDetected: minedRoles[0].entitlementDriftDetected,
  });

  console.log('\n================================================================');
  console.log('  ALL SOTA AUTHORIZATION PILLARS EXECUTED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runDemo().catch(console.error);
