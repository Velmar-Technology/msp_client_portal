import { describe, it, expect, vi } from 'vitest';
import api from "@/services/api";
import { authService } from "@/services/authService";

vi.mock('./api');

describe('authService', () => {
  describe('verifyEmail', () => {
    it('should call api.post with email and otp', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

      await authService.verifyEmail('test@example.com', '123456');

      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
        email: 'test@example.com',
        otp: '123456',
      });
    });
  });
});
