import type { AuthUser } from "@/store/useAuthStore";
import api from "@/services/api";

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// ---- Admin User Management Types ----

export type UserRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
export type ClientType = 'CLIENT' | 'ENTERPRISE' | 'STUDENT' | 'OTHER';

export interface TechnicianUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string | null;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  specialty: string | null;
  is_active: boolean;
  email_verified: boolean;
  language: string;
  avatar_url: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  tenant_id: string;
  client_type: string;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserStats {
  total: number;
  byRole: Record<string, number>;
  active: number;
  inactive: number;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: UserRole | '';
  isActive?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * User and identity management service.
 * Handles self-service profile settings, technician/client directories, and admin RBAC operations.
 */
export const userService = {
  /**
   * Fetches the current logged-in user's profile information.
   *
   * @returns Promise resolving to user profile object.
   */
  async getProfile(): Promise<Record<string, unknown>> {
    const response = await api.get('/users/me');
    return response.data.data;
  },

  /**
   * Updates the current user's profile details.
   *
   * @param data - Profile fields to update (name, email, language, avatarUrl, phoneNumber).
   * @returns Promise resolving to updated profile data.
   */
  async updateProfile(data: { name?: string; email?: string; language?: string; avatarUrl?: string | null; phoneNumber?: string | null }): Promise<Record<string, unknown>> {
    const payload = {
      name: data.name,
      email: data.email,
      language: data.language,
      avatar_url: data.avatarUrl,
      phone_number: data.phoneNumber,
    };
    const response = await api.patch('/users/me', payload);
    return response.data.data;
  },

  /**
   * Uploads a new avatar image for the current user.
   *
   * @param file - Image file to upload.
   * @returns Promise resolving to new avatar URL.
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Updates the current user's password.
   *
   * @param data - Object with currentPassword, newPassword, and confirmPassword.
   * @returns Promise resolving on successful password change.
   * @throws {ValidationError} If current password is incorrect or new password validation fails.
   */
  async changePassword(data: ChangePasswordPayload): Promise<void> {
    await api.put('/users/me/password', data);
  },

  /**
   * Retrieves the list of technicians available in the system.
   *
   * @returns Promise resolving to array of TechnicianUser objects.
   */
  async getTechnicians(): Promise<TechnicianUser[]> {
    const response = await api.get('/users/technicians');
    return response.data.data;
  },

  /**
   * Retrieves the list of registered clients for admin workflows.
   *
   * @returns Promise resolving to array of AuthUser client records.
   */
  async getClients(): Promise<AuthUser[]> {
    const response = await api.get('/users/clients');
    return response.data.data;
  },

  // ---- Admin User Management ----

  /**
   * Admin: Retrieves a paginated, filterable list of all managed users across tenants.
   *
   * @param params - Filters for page, limit, role, isActive, search keyword, and sort order.
   * @returns Promise resolving to paginated UserListResponse.
   */
  async getAllUsers(params: UserListParams): Promise<UserListResponse> {
    const queryParams: Record<string, string> = {};
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.role) queryParams.role = params.role;
    if (params.isActive !== undefined && params.isActive !== '') queryParams.isActive = params.isActive;
    if (params.search) queryParams.search = params.search;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

    const response = await api.get('/users', { params: queryParams });
    return response.data.data;
  },

  /**
   * Admin: Retrieves aggregate user counts grouped by role and active status.
   *
   * @returns Promise resolving to UserStats aggregate metrics.
   */
  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/users/stats');
    return response.data.data;
  },

  /**
   * Admin: Updates the RBAC role of a target user.
   *
   * @param userId - Target user UUID.
   * @param role - Target UserRole ('CLIENT' | 'TECHNICIAN' | 'ADMIN').
   * @returns Promise resolving to updated ManagedUser entity.
   */
  async updateUserRole(userId: string, role: UserRole): Promise<ManagedUser> {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data.data;
  },

  /**
   * Admin: Activates or deactivates a user account.
   *
   * @param userId - Target user UUID.
   * @param isActive - Desired active state.
   * @returns Promise resolving to updated ManagedUser entity.
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<ManagedUser> {
    const response = await api.patch(`/users/${userId}/status`, { is_active: isActive });
    return response.data.data;
  },

  /**
   * Admin: Bulk updates active status for multiple user accounts.
   *
   * @param userIds - Array of target user UUIDs.
   * @param isActive - Desired active state.
   * @returns Promise resolving to updated count.
   */
  async bulkUpdateStatus(userIds: string[], isActive: boolean): Promise<{ updatedCount: number }> {
    const response = await api.patch('/users/bulk/status', { userIds, is_active: isActive });
    return response.data.data;
  },

  /**
   * Admin: Bulk updates RBAC role for multiple user accounts.
   *
   * @param userIds - Array of target user UUIDs.
   * @param role - Target UserRole.
   * @returns Promise resolving to updated count.
   */
  async bulkUpdateRole(userIds: string[], role: UserRole): Promise<{ updatedCount: number }> {
    const response = await api.patch('/users/bulk/role', { userIds, role });
    return response.data.data;
  },

  /**
   * Admin: Updates the client type classification for a user.
   *
   * @param userId - Target user UUID.
   * @param clientType - Target ClientType.
   * @returns Promise resolving to updated ManagedUser entity.
   */
  async updateUserClientType(userId: string, clientType: ClientType): Promise<ManagedUser> {
    const response = await api.patch(`/users/${userId}/client-type`, { clientType });
    return response.data.data;
  },

  /**
   * Admin: Bulk updates client type classification for multiple users.
   *
   * @param userIds - Array of target user UUIDs.
   * @param clientType - Target ClientType.
   * @returns Promise resolving to updated count.
   */
  async bulkUpdateClientType(userIds: string[], clientType: ClientType): Promise<{ updatedCount: number }> {
    const response = await api.patch('/users/bulk/client-type', { userIds, clientType });
    return response.data.data;
  },

  /**
   * Admin: Permanently deletes a user account.
   *
   * @param userId - Target user UUID.
   * @returns Promise resolving upon deletion.
   */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}`);
  },

  /**
   * Admin: Bulk deletes multiple user accounts.
   *
   * @param userIds - Array of target user UUIDs.
   * @returns Promise resolving to deleted count.
   */
  async bulkDeleteUsers(userIds: string[]): Promise<{ deletedCount: number }> {
    const response = await api.delete('/users/bulk', { data: { userIds } });
    return response.data.data;
  },
};

