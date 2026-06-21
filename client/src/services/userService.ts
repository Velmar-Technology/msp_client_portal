import api from './api';

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export const userService = {
  async getProfile(): Promise<Record<string, unknown>> {
    const response = await api.get('/users/me');
    return response.data.data;
  },

  async updateProfile(data: { name?: string; email?: string; language?: string }): Promise<Record<string, unknown>> {
    const response = await api.patch('/users/me', data);
    return response.data.data;
  },

  async changePassword(data: ChangePasswordPayload): Promise<void> {
    await api.put('/users/me/password', data);
  },

  async getTechnicians(): Promise<any[]> {
    const response = await api.get('/users/technicians');
    return response.data.data;
  },
};
