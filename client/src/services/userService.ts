import type { AuthUser } from "@/store/useAuthStore";
import api from "@/services/api";

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// ---- Admin User Management Types ----

export type UserRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN';

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
}

export const userService = {
  async getProfile(): Promise<Record<string, unknown>> {
    const response = await api.get('/users/me');
    return response.data.data;
  },

  async updateProfile(data: { name?: string; email?: string; language?: string; avatarUrl?: string | null }): Promise<Record<string, unknown>> {
    const payload = {
      name: data.name,
      email: data.email,
      language: data.language,
      avatar_url: data.avatarUrl,
    };
    const response = await api.patch('/users/me', payload);
    return response.data.data;
  },

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

  async changePassword(data: ChangePasswordPayload): Promise<void> {
    await api.put('/users/me/password', data);
  },

  async getTechnicians(): Promise<unknown[]> {
    const response = await api.get('/users/technicians');
    return response.data.data;
  },

  async getClients(): Promise<AuthUser[]> {
    const response = await api.get('/users/clients');
    return response.data.data;
  },

  // ---- Admin User Management ----

  async getAllUsers(params: UserListParams): Promise<UserListResponse> {
    const queryParams: Record<string, string> = {};
    if (params.page) queryParams.page = String(params.page);
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.role) queryParams.role = params.role;
    if (params.isActive !== undefined && params.isActive !== '') queryParams.isActive = params.isActive;
    if (params.search) queryParams.search = params.search;

    const response = await api.get('/users', { params: queryParams });
    return response.data.data;
  },

  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/users/stats');
    return response.data.data;
  },

  async updateUserRole(userId: string, role: UserRole): Promise<ManagedUser> {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data.data;
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<ManagedUser> {
    const response = await api.patch(`/users/${userId}/status`, { is_active: isActive });
    return response.data.data;
  },

  async bulkUpdateStatus(userIds: string[], isActive: boolean): Promise<{ updatedCount: number }> {
    const response = await api.patch('/users/bulk/status', { userIds, is_active: isActive });
    return response.data.data;
  },

  async bulkUpdateRole(userIds: string[], role: UserRole): Promise<{ updatedCount: number }> {
    const response = await api.patch('/users/bulk/role', { userIds, role });
    return response.data.data;
  },
};

