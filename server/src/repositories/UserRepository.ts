import { BaseRepository } from './BaseRepository';
import { User, UserRole } from '../types';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.query<User>(
      'SELECT * FROM users WHERE role = $1 AND is_active = true ORDER BY name',
      [role],
    );
  }

  async findTechniciansBySpecialty(specialty: string): Promise<User[]> {
    return this.query<User>(
      `SELECT * FROM users 
       WHERE role = 'TECHNICIAN' AND is_active = true AND specialty ILIKE $1 
       ORDER BY name`,
      [`%${specialty}%`],
    );
  }

  async findActiveTechnicians(): Promise<User[]> {
    return this.query<User>(
      `SELECT * FROM users WHERE role = 'TECHNICIAN' AND is_active = true ORDER BY name`,
    );
  }

  async create(data: {
    email: string;
    name: string;
    password_hash: string;
    role?: UserRole;
    language?: string;
    tenant_id: string;
  }): Promise<User> {
    const result = await this.queryOne<User>(
      `INSERT INTO users (email, name, password_hash, role, language, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.email,
        data.name,
        data.password_hash,
        data.role || UserRole.CLIENT,
        data.language || 'en_US',
        data.tenant_id,
      ],
    );
    return result!;
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'name' | 'email' | 'language'>>): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.language !== undefined) {
      fields.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    return this.queryOne<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
  }

  async verifyEmail(id: string): Promise<void> {
    await this.query('UPDATE users SET email_verified = true WHERE id = $1', [id]);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  }
}

export const userRepository = new UserRepository();
