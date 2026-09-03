import { env } from '@shared/config/env';
import { logger } from '@shared/utils/logger';
import { ExternalServiceError } from '@shared/errors';

export interface VaultwardenOrgDetails {
  id: string;
  name: string;
  billingEmail: string;
}

export interface VaultwardenInviteResult {
  invited: boolean;
  email: string;
  orgId: string;
}

/**
 * Domain service integrating with the hosted Vaultwarden instance via its Admin & Org REST APIs
 * for organization lifecycle management, user deactivation/suspension, and tenant data purge (BL-702).
 */
export class VaultwardenService {
  /**
   * Normalizes the base URL for Vaultwarden.
   *
   * @returns Clean base URL without trailing slash
   */
  private getBaseUrl(): string {
    let rawUrl = env.VAULTWARDEN_URL || 'http://vaultwarden:80';
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `http://${rawUrl}`;
    }
    return rawUrl.replace(/\/+$/, '');
  }

  /**
   * Builds the Authorization header for Vaultwarden API calls.
   *
   * @returns Record with Authorization or cookie headers
   */
  private getHeaders(): Record<string, string> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Programmatically creates or provisions an Organization in Vaultwarden for an MSP tenant.
   * If the service is unconfigured or in offline demo mode, returns a mock provisioned organization.
   *
   * @param orgName - Display name of the tenant organization
   * @param billingEmail - Owner/admin contact email
   * @returns Organization ID and details
   * @throws {ExternalServiceError} When upstream Vaultwarden API fails
   */
  async createOrganization(orgName: string, billingEmail: string): Promise<VaultwardenOrgDetails> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const baseUrl = this.getBaseUrl();

    if (!token) {
      logger.warn('VAULTWARDEN_ADMIN_TOKEN not set; simulating organization creation');
      return {
        id: `vw_org_${Math.random().toString(36).substring(2, 10)}`,
        name: orgName,
        billingEmail,
      };
    }

    try {
      const response = await fetch(`${baseUrl}/api/organizations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: orgName,
          billingEmail,
          collectionName: 'General',
          planType: 0,
        }),
      });

      if (!response.ok) {
        throw new ExternalServiceError('Failed to create Vaultwarden organization', {
          service: 'vaultwarden',
          upstream: response.status,
        });
      }

      const data = (await response.json()) as { Id?: string; id?: string; Name?: string; name?: string };
      const id = data.Id || data.id || `vw_org_${Math.random().toString(36).substring(2, 10)}`;

      logger.info(`Provisioned Vaultwarden organization "${orgName}" (${id})`);
      return {
        id,
        name: orgName,
        billingEmail,
      };
    } catch (err: unknown) {
      if (err instanceof ExternalServiceError) throw err;
      logger.error('Error contacting Vaultwarden to create organization', { err });
      throw new ExternalServiceError('Vaultwarden connection error during organization creation', {
        service: 'vaultwarden',
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Invites a user email to an organization.
   *
   * @param orgId - Target organization identifier
   * @param email - Target user email
   * @param role - Access role (User, Manager, Admin)
   * @returns Result indicating whether invitation succeeded
   * @throws {ExternalServiceError} When invitation API fails
   */
  async inviteUserToOrganization(
    orgId: string,
    email: string,
    role: 'User' | 'Manager' | 'Admin' = 'User'
  ): Promise<VaultwardenInviteResult> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const baseUrl = this.getBaseUrl();

    if (!token) {
      logger.warn(`VAULTWARDEN_ADMIN_TOKEN not set; simulating invitation for ${email}`);
      return { invited: true, email, orgId };
    }

    try {
      const roleTypeMap: Record<string, number> = {
        User: 2,
        Manager: 1,
        Admin: 0,
      };

      const response = await fetch(`${baseUrl}/api/organizations/${orgId}/users/invite`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          emails: [email],
          type: roleTypeMap[role] ?? 2,
          accessAll: true,
        }),
      });

      if (!response.ok) {
        throw new ExternalServiceError(`Failed to invite ${email} to Vaultwarden organization`, {
          service: 'vaultwarden',
          upstream: response.status,
        });
      }

      logger.info(`Invited ${email} to Vaultwarden organization ${orgId}`);
      return { invited: true, email, orgId };
    } catch (err: unknown) {
      if (err instanceof ExternalServiceError) throw err;
      logger.error(`Error inviting user ${email} to Vaultwarden org ${orgId}`, { err });
      throw new ExternalServiceError('Vaultwarden invitation request failed', {
        service: 'vaultwarden',
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Deactivates all users associated with a tenant organization upon reaching Day 15 SUSPENDED (BL-702).
   * This locks out member logins to protect data without destroying encrypted vaults.
   *
   * @param orgId - Organization UUID
   * @returns Number of users deactivated
   */
  async deactivateOrganizationUsers(orgId: string): Promise<number> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const baseUrl = this.getBaseUrl();

    if (!token) {
      logger.warn(`VAULTWARDEN_ADMIN_TOKEN not configured; simulating user deactivation for org ${orgId}`);
      return 1;
    }

    try {
      // List organization users
      const response = await fetch(`${baseUrl}/api/organizations/${orgId}/users`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        logger.warn(`Could not list users for org ${orgId} during suspension; upstream status ${response.status}`);
        return 0;
      }

      const users = (await response.json()) as { Data?: Array<{ Id: string; Status: number }> };
      const userList = users.Data || [];
      let deactivatedCount = 0;

      for (const u of userList) {
        // Vaultwarden Status 0: Revoked / Suspended
        const suspendResp = await fetch(`${baseUrl}/api/organizations/${orgId}/users/${u.Id}/revoke`, {
          method: 'PUT',
          headers: this.getHeaders(),
        });
        if (suspendResp.ok) {
          deactivatedCount++;
        }
      }

      logger.info(`Suspended/revoked ${deactivatedCount} users in Vaultwarden org ${orgId} (BL-702)`);
      return deactivatedCount;
    } catch (err) {
      logger.error(`Failed to deactivate users in Vaultwarden org ${orgId}`, { err });
      return 0;
    }
  }

  /**
   * Reactivates users associated with a tenant organization when non-payment is resolved.
   *
   * @param orgId - Organization UUID
   * @returns Number of users reactivated
   */
  async reactivateOrganizationUsers(orgId: string): Promise<number> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const baseUrl = this.getBaseUrl();

    if (!token) {
      logger.warn(`VAULTWARDEN_ADMIN_TOKEN not configured; simulating user reactivation for org ${orgId}`);
      return 1;
    }

    try {
      const response = await fetch(`${baseUrl}/api/organizations/${orgId}/users`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return 0;

      const users = (await response.json()) as { Data?: Array<{ Id: string }> };
      const userList = users.Data || [];
      let restoredCount = 0;

      for (const u of userList) {
        const restoreResp = await fetch(`${baseUrl}/api/organizations/${orgId}/users/${u.Id}/restore`, {
          method: 'PUT',
          headers: this.getHeaders(),
        });
        if (restoreResp.ok) {
          restoredCount++;
        }
      }

      logger.info(`Reactivated ${restoredCount} users in Vaultwarden org ${orgId}`);
      return restoredCount;
    } catch (err) {
      logger.error(`Failed to reactivate users in Vaultwarden org ${orgId}`, { err });
      return 0;
    }
  }

  /**
   * Permanently deletes a tenant organization and its vault data upon reaching Day 30 PURGED (BL-702).
   * Liberates storage and terminates cryptographic records with zero liability.
   *
   * @param orgId - Target organization identifier
   * @returns True if successfully purged
   * @throws {ExternalServiceError} When deletion fails
   */
  async deleteOrganization(orgId: string): Promise<boolean> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const baseUrl = this.getBaseUrl();

    if (!token) {
      logger.warn(`VAULTWARDEN_ADMIN_TOKEN not set; simulating purge of organization ${orgId}`);
      return true;
    }

    try {
      const response = await fetch(`${baseUrl}/api/organizations/${orgId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        throw new ExternalServiceError(`Failed to delete Vaultwarden org ${orgId}`, {
          service: 'vaultwarden',
          upstream: response.status,
        });
      }

      logger.info(`Successfully purged Vaultwarden organization ${orgId} (BL-702)`);
      return true;
    } catch (err: unknown) {
      if (err instanceof ExternalServiceError) throw err;
      logger.error(`Error deleting Vaultwarden organization ${orgId}`, { err });
      throw new ExternalServiceError('Vaultwarden purge request failed', {
        service: 'vaultwarden',
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Resets a user's vault access by purging their stale/locked account record in Vaultwarden
   * and issuing a fresh organization invitation so they can configure a new Master Password (zero-knowledge).
   *
   * @param tenantId - Tenant UUID identifying the Bitwarden Organization
   * @param userEmail - Target user email address
   * @returns Object indicating success status and informative message
   * @throws {ExternalServiceError} When communication with upstream Vaultwarden fails
   */
  async resetUserVaultAccess(
    tenantId: string,
    userEmail: string
  ): Promise<{ success: boolean; message: string }> {
    const token = env.VAULTWARDEN_ADMIN_TOKEN;
    const baseUrl = this.getBaseUrl();

    if (!token) {
      logger.warn(`VAULTWARDEN_ADMIN_TOKEN not set; simulating vault reset for ${userEmail}`);
      return {
        success: true,
        message: 'Simulated reset invitation sent successfully.',
      };
    }

    try {
      // 1. Locate user in tenant organization if already enrolled
      const orgUsersResp = await fetch(`${baseUrl}/api/organizations/${tenantId}/users`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (orgUsersResp.ok) {
        const orgUsers = (await orgUsersResp.json()) as { Data?: Array<{ Id: string; Email?: string }> };
        const matchingMember = (orgUsers.Data || []).find(
          (u) => u.Email?.toLowerCase() === userEmail.toLowerCase()
        );

        if (matchingMember) {
          // Remove from organization
          await fetch(`${baseUrl}/api/organizations/${tenantId}/users/${matchingMember.Id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
          });
        }
      }

      // 2. Locate user in global admin users list to delete the account record
      try {
        const adminUsersResp = await fetch(`${baseUrl}/admin/users`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (adminUsersResp.ok) {
          const adminUsers = (await adminUsersResp.json()) as Array<{ Id: string; Email: string }>;
          if (Array.isArray(adminUsers)) {
            const userRecord = adminUsers.find(
              (u) => u.Email?.toLowerCase() === userEmail.toLowerCase()
            );
            if (userRecord) {
              await fetch(`${baseUrl}/admin/users/${userRecord.Id}/delete`, {
                method: 'POST',
                headers: this.getHeaders(),
              });
              logger.info(`Purged user account ${userEmail} (${userRecord.Id}) via Vaultwarden Admin API`);
            }
          }
        }
      } catch (adminErr) {
        logger.warn(`Could not delete global Vaultwarden user record for ${userEmail}; proceeding to invite`, { adminErr });
      }

      // 3. Re-issue fresh organization invitation
      await this.inviteUserToOrganization(tenantId, userEmail, 'User');

      logger.info(`Successfully reset vault access and re-invited ${userEmail} to org ${tenantId}`);
      return {
        success: true,
        message: 'A fresh invitation has been dispatched. Please check your email to set a new Master Password.',
      };
    } catch (err: unknown) {
      if (err instanceof ExternalServiceError) throw err;
      logger.error(`Error resetting vault access for ${userEmail} in org ${tenantId}`, { err });
      throw new ExternalServiceError('Vault access reset failed', {
        service: 'vaultwarden',
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export const vaultwardenService = new VaultwardenService();
