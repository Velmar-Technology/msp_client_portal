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
}
