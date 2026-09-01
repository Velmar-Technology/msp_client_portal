import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

/**
 * Registers Zero Standing Privileges (ZSP), JIT Ephemeral Access,
 * and Continuous Adaptive Trust tools for the MCP server.
 *
 * @see BL-302 Hybrid Authorization & ZSP Specification
 */
export function registerAuthzTools(server: McpServer, apiClient: MspApiClient) {
  // 1. Tool: msp_request_ephemeral_access
  server.tool(
    'msp_request_ephemeral_access',
    'Request Just-In-Time (JIT) ephemeral privilege elevation (Zero Standing Privileges - ZSP) with TTL and business justification',
    {
      role: z
        .enum(['ADMIN', 'TECHNICIAN', 'BILLING_ADMIN', 'SECURITY_AUDITOR'])
        .describe('Target elevated role requested'),
      reason: z
        .string()
        .min(5)
        .describe('Detailed business justification for elevated privilege access'),
      durationMinutes: z
        .number()
        .min(5)
        .max(240)
        .default(60)
        .describe('Grant duration in minutes (default: 60m, max: 240m)'),
      emergencyBreakGlass: z
        .boolean()
        .default(false)
        .describe('Flag for emergency break-glass override during critical incidents'),
    },
    async ({ role, reason, durationMinutes, emergencyBreakGlass }) => {
      try {
        const grant = await apiClient.requestEphemeralAccess({
          role,
          reason,
          durationMinutes,
          emergencyBreakGlass,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Ephemeral access granted successfully:\n${JSON.stringify(grant, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to request ephemeral access: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_list_active_jit_grants
  server.tool(
    'msp_list_active_jit_grants',
    'List currently active JIT ephemeral elevated grants and their remaining validity TTL',
    {},
    async () => {
      try {
        const grants = await apiClient.listActiveEphemeralGrants();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(grants, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list ephemeral grants: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_revoke_ephemeral_grant
  server.tool(
    'msp_revoke_ephemeral_grant',
    'Immediately revoke an active ephemeral privilege elevation grant',
    {
      grantId: z.string().describe('UUID of the ephemeral grant to revoke'),
      reason: z.string().optional().describe('Optional reason for revocation'),
    },
    async ({ grantId, reason }) => {
      try {
        const res = await apiClient.revokeEphemeralGrant(grantId, reason);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to revoke grant: ${err.message}` }],
        };
      }
    }
  );

  // 4. Tool: msp_check_access_decision
  server.tool(
    'msp_check_access_decision',
    'Test an authorization decision against the Unified PDP (RBAC + Zanzibar ReBAC + ABAC)',
    {
      action: z.string().describe('Action to evaluate (e.g., ticket:update, equipment:write, rmm:exec)'),
      resourceType: z.string().describe('Resource type (e.g., ticket, equipment, invoice, tenant)'),
      resourceId: z.string().optional().describe('Resource ID if evaluating specific entity relation'),
      tenantId: z.string().optional().describe('Tenant ID context'),
    },
    async ({ action, resourceType, resourceId, tenantId }) => {
      try {
        const decision = await apiClient.checkAccessDecision({
          action,
          resource: {
            type: resourceType,
            id: resourceId,
            tenantId,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(decision, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to evaluate access decision: ${err.message}` }],
        };
      }
    }
  );

  // 5. Tool: msp_get_trust_score
  server.tool(
    'msp_get_trust_score',
    'Query real-time Continuous Adaptive Trust (CAT) risk anomaly score and risk factors',
    {
      userId: z.string().optional().describe('User UUID to evaluate (defaults to current authenticated user)'),
    },
    async ({ userId }) => {
      try {
        const score = await apiClient.getTrustScore(userId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(score, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get trust score: ${err.message}` }],
        };
      }
    }
  );
}
