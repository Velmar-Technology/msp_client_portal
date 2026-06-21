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
};
