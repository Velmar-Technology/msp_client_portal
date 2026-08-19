import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

export function registerTicketTools(server: McpServer, apiClient: MspApiClient) {
  // 1. Tool: msp_get_ticket
  server.tool(
    'msp_get_ticket',
    'Fetch complete ticket details, assigned technician, SLA status, and linked equipment ID',
    {
      ticketId: z.string().uuid().describe('The UUID of the support ticket to inspect'),
    },
    async ({ ticketId }) => {
      try {
        const ticket = await apiClient.getTicket(ticketId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(ticket, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch ticket: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_list_tickets
  server.tool(
    'msp_list_tickets',
    'List support tickets filtered by status, priority, category, or technician',
    {
      status: z
        .enum([
          'OPEN',
          'IN_PROGRESS',
          'AWAITING_PAYMENT',
          'RESOLVED',
          'RESOLVED_AUTOMATED',
          'CLOSED',
          'CANCELLED',
        ])
        .optional()
        .describe('Filter by ticket status'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Filter by ticket priority'),
      category: z
        .enum(['REPAIR', 'WARRANTY', 'SERVICE_OUTAGE', 'PREVENTATIVE_MAINTENANCE'])
        .optional()
        .describe('Filter by ticket category'),
      assignedTechId: z.string().uuid().optional().describe('Filter by assigned technician UUID'),
      tenantId: z.string().uuid().optional().describe('Filter by tenant / client company UUID'),
    },
    async (params) => {
      try {
        const tickets = await apiClient.listTickets(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tickets, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list tickets: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_add_ticket_reply
  server.tool(
    'msp_add_ticket_reply',
    'Post an internal diagnostic note or client-visible update to a support ticket',
    {
      ticketId: z.string().uuid().describe('The UUID of the ticket'),
      message: z.string().min(1).describe('The message or diagnosis content to post'),
      isInternal: z
        .boolean()
        .default(false)
        .describe('Set to true for private technician/AI triage notes, false for customer-facing reply'),
    },
    async ({ ticketId, message, isInternal }) => {
      try {
        const result = await apiClient.addTicketReply(ticketId, message, isInternal);
        return {
          content: [
            {
              type: 'text',
              text: `Reply successfully posted to ticket ${ticketId}.\nDetails: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to add ticket reply: ${err.message}` }],
        };
      }
    }
  );

  // 4. Tool: msp_update_ticket_status
  server.tool(
    'msp_update_ticket_status',
    'Update ticket lifecycle status (enforcing state machine & 1-hour SLA cancellation rules)',
    {
      ticketId: z.string().uuid().describe('The UUID of the ticket to transition'),
      status: z
        .enum([
          'OPEN',
          'IN_PROGRESS',
          'AWAITING_PAYMENT',
          'RESOLVED',
          'RESOLVED_AUTOMATED',
          'CLOSED',
          'CANCELLED',
        ])
        .describe('New status to transition to'),
      notes: z.string().optional().describe('Optional reason or resolution notes for the status change'),
    },
    async ({ ticketId, status, notes }) => {
      try {
        const updated = await apiClient.updateTicketStatus(ticketId, status, notes);
        return {
          content: [
            {
              type: 'text',
              text: `Ticket status successfully changed to ${status}.\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update ticket status: ${err.message}` }],
        };
      }
    }
  );
}
