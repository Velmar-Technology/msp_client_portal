import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

/**
 * Registers billing, invoice, and financial analytics MCP tools.
 *
 * @param server - MCP Server instance
 * @param apiClient - MSP API Client instance
 */
export function registerBillingTools(server: McpServer, apiClient: MspApiClient): void {
  // 1. Tool: msp_list_invoices
  server.tool(
    'msp_list_invoices',
    'List all client and platform invoices with pagination, NCF status, totals, and settlement state',
    {
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of invoices per page (default: 20, max: 100)'),
    },
    async ({ page, limit }) => {
      try {
        const invoicesResult = await apiClient.listInvoices({ page, limit });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(invoicesResult, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list invoices: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_get_invoice
  server.tool(
    'msp_get_invoice',
    'Retrieve complete details of a specific invoice including items, amounts, ITBIS tax, and NCF voucher info',
    {
      invoiceId: z.string().uuid().describe('Unique UUID of the target invoice'),
    },
    async ({ invoiceId }) => {
      try {
        const invoice = await apiClient.getInvoice(invoiceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(invoice, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get invoice ${invoiceId}: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_get_financial_stats
  server.tool(
    'msp_get_financial_stats',
    'Retrieve high-level financial dashboard KPIs, revenue aggregates, and payment trends',
    {
      range: z.enum(['30_days', 'quarter', 'year']).optional().describe('Time window filter (default: 30_days)'),
    },
    async ({ range = '30_days' }) => {
      try {
        const stats = await apiClient.getFinancialStats(range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get financial stats: ${err.message}` }],
        };
      }
    }
  );

  // 4. Tool: msp_list_expenses
  server.tool(
    'msp_list_expenses',
    'List organization operating expenses and technician commission bounties (BL-801/BL-802)',
    {},
    async () => {
      try {
        const expenses = await apiClient.listExpenses();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(expenses, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list expenses: ${err.message}` }],
        };
      }
    }
  );
}
