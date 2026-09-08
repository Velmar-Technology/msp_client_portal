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

  // 5. Tool: msp_list_plans (Pricing Catalog Export)
  server.tool(
    'msp_list_plans',
    'Export the full subscription plans pricing catalog, tiers, billing terms, feature codes, and limits',
    {
      clientType: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER']).optional().describe('Filter by target client segment'),
      format: z.enum(['markdown_table', 'json']).default('markdown_table').describe('Output format (default: markdown_table)'),
    },
    async ({ clientType, format }) => {
      try {
        const res = await apiClient.listPlans({ clientType });
        const plans = Array.isArray(res) ? res : res.data || [];

        if (format === 'json') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(plans, null, 2),
              },
            ],
          };
        }

        // Generate rich GitHub-flavored Markdown pricing table
        let md = '# MSP Subscription Plans & Pricing Catalog\n\n';
        md += '| Plan ID | Tier / Name | Segment | Price (USD) | Status | Highlights / Features |\n';
        md += '| :---: | :--- | :---: | :---: | :---: | :--- |\n';

        for (const p of plans) {
          const name = p.name?.en_US || p.name || 'Unnamed';
          const segment = p.client_type || 'ALL';
          const price = `$${p.price || 0} / mo`;
          const status = p.active ? (p.recommended ? '🟢 **Recommended**' : '🟢 Active') : '⚪ Inactive';

          const featureList = (p.features || [])
            .map((f: any) => {
              if (f.code) return `\`${f.code}\``;
              if (f.text?.en_US) return f.text.en_US;
              if (f.text?.es_DO) return f.text.es_DO;
              return null;
            })
            .filter(Boolean)
            .slice(0, 4)
            .join(', ');

          md += `| **${p.id}** | ${name} | ${segment} | ${price} | ${status} | ${featureList || 'Standard features'} |\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: md,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to export pricing table: ${err.message}` }],
        };
      }
    }
  );
}
