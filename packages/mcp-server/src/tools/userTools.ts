import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

/**
 * Registers user and identity management MCP tools.
 *
 * @param server - MCP Server instance
 * @param apiClient - MSP API Client instance
 */
export function registerUserTools(server: McpServer, apiClient: MspApiClient): void {
  // 1. Tool: msp_list_users
  server.tool(
    'msp_list_users',
    'List all registered platform users with pagination, role filtering, search, and active status filters (Admin only)',
    {
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of users per page (default: 20, max: 100)'),
      role: z.enum(['ADMIN', 'TECHNICIAN', 'CLIENT']).optional().describe('Filter users by role'),
      isActive: z.boolean().optional().describe('Filter users by active status'),
      search: z.string().optional().describe('Search query matching user name or email address'),
      sortBy: z.enum(['name', 'role', 'client_type', 'is_active', 'created_at']).optional().describe('Sort column'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order direction'),
    },
    async ({ page, limit, role, isActive, search, sortBy, sortOrder }) => {
      try {
        const usersResult = await apiClient.listUsers({
          page,
          limit,
          role,
          isActive,
          search,
          sortBy,
          sortOrder,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(usersResult, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list users: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_get_user_profile
  server.tool(
    'msp_get_user_profile',
    'Retrieve the profile and tenant context of the currently authenticated MSP user / API key owner',
    {},
    async () => {
      try {
        const profile = await apiClient.getUserProfile();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get user profile: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_get_user_stats
  server.tool(
    'msp_get_user_stats',
    'Retrieve platform-wide user count aggregates and role distribution metrics (Admin only)',
    {},
    async () => {
      try {
        const stats = await apiClient.getUserStats();
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
          content: [{ type: 'text', text: `Failed to get user stats: ${err.message}` }],
        };
      }
    }
  );

  // 4. Tool: msp_remediate_user_vault
  server.tool(
    'msp_remediate_user_vault',
    'Heal, reset, and re-issue a fresh zero-knowledge Bitwarden/Vaultwarden organization invitation for a client or admin user (BL-206)',
    {
      email: z.string().email().describe('Target user email address (e.g. epolanco@velmartech.com.do)'),
      tenantId: z.string().uuid().optional().describe('Target tenant UUID'),
    },
    async ({ email, tenantId }) => {
      try {
        const result = await apiClient.resetVaultAccess({ email, tenantId });
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
          content: [{ type: 'text', text: `Failed to remediate user vault access: ${err.message}` }],
        };
      }
    }
  );

  // 5. Tool: msp_update_user_role (manage user account)
  server.tool(
    'msp_update_user_role',
    'Seamlessly update a user role (CLIENT, TECHNICIAN, ADMIN), client category/type, or active status (Admin only)',
    {
      user: z.string().describe('Target user email (e.g. e.a.polanco.robles@gmail.com), UUID, or full name'),
      role: z.enum(['ADMIN', 'TECHNICIAN', 'CLIENT']).optional().describe('New platform role (ADMIN, TECHNICIAN, CLIENT)'),
      clientType: z.enum(['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER']).optional().describe('Customer client type / classification'),
      isActive: z.boolean().optional().describe('User account active state'),
      reason: z.string().optional().describe('Administrative reason for modification'),
    },
    async ({ user, role, clientType, isActive, reason }) => {
      try {
        const result = await apiClient.manageUserAccount({
          user,
          role,
          clientType,
          isActive,
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
          content: [{ type: 'text', text: `Failed to update user account: ${err.message}` }],
        };
      }
    }
  );
}
