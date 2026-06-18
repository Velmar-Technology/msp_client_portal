import api from './api';

export const userService = {
  async getProfile(): Promise<Record<string, unknown>> {
    const response = await api.get('/users/me');
    return response.data.data;
  },

  async updateProfile(data: { name?: string; email?: string; language?: string }): Promise<Record<string, unknown>> {
    const response = await api.patch('/users/me', data);
    return response.data.data;
  },
};
