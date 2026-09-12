import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

/**
 * Registers SequenceSentinel business logic integrity auditing tools on the MCP server.
 * Allows autonomous agents and support technicians to audit live/production event sequences
 * against Master Business Logic specifications (BL-101 through BL-802).
 *
 * @param server - MCP server instance
 * @param apiClient - Authenticated MSP API client adapter
 */
export function registerSentinelTools(server: McpServer, apiClient: MspApiClient) {
  server.tool(
    'msp_run_sentinel_audit',
    'Execute a passive SequenceSentinel integrity audit verifying multi-step action sequences against Master Business Logic rules (BL-101 to BL-802)',
    {
      hours: z
        .number()
        .int()
        .positive()
        .default(24)
        .describe('Sliding temporal window in hours to audit (default: 24)'),
      tenantId: z
        .string()
        .uuid()
        .optional()
        .describe('Optional tenant UUID filter for isolated tenant verification'),
      generateTests: z
        .boolean()
        .default(false)
        .describe('Whether to auto-synthesize runnable Vitest regression specs for detected violations'),
      autoHeal: z
        .boolean()
        .default(false)
        .describe('Whether to autonomously execute self-healing remediation actions for detected violations'),
    },
    async ({ hours, tenantId, generateTests, autoHeal }) => {
      try {
        const report = await apiClient.runSentinelAudit({
          hours,
          tenantId,
          generateTests,
          autoHeal,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `SequenceSentinel audit failed: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'msp_provision_subscription_plan',
    'Seamlessly provision, configure, and verify a subscription plan for a client tenant or user in a single atomic pass, including equipment slots, 18% ITBIS tax invoice, and SequenceSentinel audit verification',
    {
      user: z
        .string()
        .describe('Target user email (e.g. e.a.polanco.robles@gmail.com), user UUID, or workspace tenant UUID'),
      plan: z
        .string()
        .describe('Plan catalog code (e.g. PL-001) or plan name (e.g. "Basic", "Standard", "Corporate")'),
      equipmentCount: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(1)
        .describe('Initial equipment device capacity/slots to allocate (default: 1)'),
      billingCycle: z
        .enum(['monthly', 'annual'])
        .default('monthly')
        .describe('Billing cycle (monthly or annual, default: monthly)'),
      markPaid: z
        .boolean()
        .default(true)
        .describe('Whether to automatically mark initial invoice as PAID (default: true)'),
      reason: z
        .string()
        .optional()
        .describe('Operational or audit justification for provisioning'),
    },
    async ({ user, plan, equipmentCount, billingCycle, markPaid, reason }) => {
      try {
        const result = await apiClient.provisionSubscriptionPlan({
          user,
          plan,
          equipmentCount,
          billingCycle,
          markPaid,
          reason,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to provision subscription plan: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'msp_extend_subscription',
    'Seamlessly extend an active subscription contract duration (e.g. 1 year, 6 months) for a user or tenant, recalculate renewal date, generate renewal invoice with Dominican 18% ITBIS (BL-701), and optionally mark paid',
    {
      user: z
        .string()
        .describe('Target user email (e.g. e.a.polanco.robles@gmail.com), user UUID, or tenant workspace UUID'),
      extension: z
        .string()
        .default('1 year')
        .describe('Extension period or duration (e.g. "1 year", "12 months", "6 months", "2 years", default: "1 year")'),
      extendMonths: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Explicit number of months to extend by (optional, overrides extension string if set)'),
      markPaid: z
        .boolean()
        .default(true)
        .describe('Whether to automatically mark the extension invoice as PAID (default: true)'),
      reason: z
        .string()
        .optional()
        .describe('Operational or audit justification for extension'),
    },
    async ({ user, extension, extendMonths, markPaid, reason }) => {
      try {
        const result = await apiClient.extendSubscription({
          user,
          extension,
          extendMonths,
          markPaid,
          reason,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to extend subscription: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'msp_audit_portainer_infrastructure',
    'Seamlessly audit live Portainer infrastructure, Docker compose stack configuration, running containers, container health checks, and exposed ports in one atomic call',
    {
      portainerUrl: z
        .string()
        .optional()
        .describe('Portainer base URL (default: https://helpdesk.velmartech.com.do:9443 or from PORTAINER_URL)'),
      apiKey: z
        .string()
        .optional()
        .describe('Portainer API key (default: from PORTAINER_API_KEY)'),
      endpointId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Portainer Docker endpoint ID (default: 3 or from PORTAINER_ENDPOINT_ID)'),
      stackId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Portainer compose stack ID (default: 17 or from PORTAINER_STACK)'),
    },
    async ({ portainerUrl, apiKey, endpointId, stackId }) => {
      try {
        const result = await apiClient.auditPortainerInfrastructure({
          portainerUrl,
          apiKey,
          endpointId,
          stackId,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to audit Portainer infrastructure: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'msp_manage_features',
    'Add, remove, or customize subscription feature entitlements on demand for a specific user/tenant or pricing plan catalog entry (BL-204)',
    {
      user: z
        .string()
        .optional()
        .describe('Target user email (e.g. e.a.polanco.robles@gmail.com), UUID, or tenant workspace UUID to customize features for their active subscription'),
      plan: z
        .string()
        .optional()
        .describe('Target plan catalog ID (e.g. PL-001) or tier name to modify catalog features directly'),
      addFeatures: z
        .array(z.string())
        .optional()
        .describe('Canonical feature codes to add/grant (e.g. ["PASSWORD_MANAGER", "DARK_WEB_MONITORING", "EDR_SECURITY"])'),
      removeFeatures: z
        .array(z.string())
        .optional()
        .describe('Canonical feature codes to remove/revoke (e.g. ["BACKUP_INCLUDED", "CLOUD_STORAGE"])'),
      setFeatures: z
        .array(z.string())
        .optional()
        .describe('Explicit array of feature codes to replace current features entirely'),
      reason: z
        .string()
        .optional()
        .describe('Operational context or audit justification for entitlement modification'),
    },
    async ({ user, plan, addFeatures, removeFeatures, setFeatures, reason }) => {
      try {
        const result = await apiClient.manageFeatures({
          user,
          plan,
          addFeatures,
          removeFeatures,
          setFeatures,
          reason,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to manage features: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
