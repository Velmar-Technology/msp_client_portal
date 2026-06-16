import { userRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';
import { User, UserRole } from '../types';
import { UpdateProfileInput } from '../dtos/user.dto';

export class UserService {
  async getProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const { password_hash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<Omit<User, 'password_hash'>> {
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing && existing.id !== userId) {
        throw AppError.conflict('Email already in use');
      }
    }

    const updated = await userRepository.updateProfile(userId, data);
    if (!updated) throw AppError.internal('Failed to update profile');
    const { password_hash, ...profile } = updated;
    return profile;
  }

  async getTechnicians(): Promise<Omit<User, 'password_hash'>[]> {
    const techs = await userRepository.findByRole(UserRole.TECHNICIAN);
    return techs.map(({ password_hash, ...t }) => t);
  }
}

export const userService = new UserService();
