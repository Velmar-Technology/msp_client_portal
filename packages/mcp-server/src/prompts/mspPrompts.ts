import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerMspPrompts(server: McpServer) {
  // 1. Prompt: triage_ticket
  server.prompt(
    'triage_ticket',
    'Perform autonomous Tier-1 / Tier-2 triage for an MSP support ticket with root-cause analysis',
    {
      ticketId: z.string().describe('The ID or UUID of the ticket to diagnose'),
    },
    ({ ticketId }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please triage MSP Support Ticket #${ticketId}. Follow these steps:
1. Call 'msp_get_ticket' to retrieve the problem description and linked equipment ID.
2. If equipment is linked, call 'msp_get_device_telemetry' and 'msp_list_device_patches'.
3. Inspect recent errors using 'msp_get_local_event_logs' or host diagnostics if on the affected endpoint.
4. Synthesize your findings:
   - Root Cause Hypothesis
   - Severity / Priority verification
   - Immediate Remediation Steps (PowerShell / manual actions)
   - Draft a customer-friendly update message and an internal technician note.`,
            },
          },
        ],
      };
    }
  );

  // 2. Prompt: qbr_executive_brief
  server.prompt(
    'qbr_executive_brief',
    'Generate an executive Quarterly Business Review (QBR) IT health summary for a client tenant',
    {
      tenantId: z.string().describe('The UUID of the tenant / client organization'),
      companyName: z.string().describe('Name of the client company'),
    },
    ({ tenantId, companyName }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a comprehensive Quarterly Business Review (QBR) presentation for ${companyName} (Tenant ID: ${tenantId}):
1. Call 'msp_get_client_health' to calculate the composite health score across tickets, hardware, and security.
2. Call 'msp_get_client_equipment' to inspect all enrolled devices, aging hardware, and backup slots.
3. Call 'msp_list_tickets' to analyze ticket volume, recurring categories, and average resolution speed.
4. Output a polished Executive Summary with:
   - Overall IT Health Score & Grade
   - Top 3 Operational Risks
   - Hardware Refresh Recommendations
   - Strategic IT Roadmap for next quarter.`,
            },
          },
        ],
      };
    }
  );
}
