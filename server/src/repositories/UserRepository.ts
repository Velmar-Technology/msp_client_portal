import { BaseRepository } from './BaseRepository';
import { User, UserRole } from '../types';
import { db, users } from '../db';
import { eq, and, ilike, asc, sql } from 'drizzle-orm';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(users, 'users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return (results[0] as User) || null;
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, role), eq(users.is_active, true)))
      .orderBy(asc(users.name));
    return results as User[];
  }

  async findClientsByTenant(tenantId: string): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, UserRole.CLIENT),
          eq(users.tenant_id, tenantId),
          eq(users.is_active, true)
        )
      )
      .orderBy(asc(users.name));
    return results as User[];
  }

  async findAllClients(): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, UserRole.CLIENT), eq(users.is_active, true)))
      .orderBy(asc(users.name));
    return results as User[];
  }

  async findTechniciansBySpecialty(specialty: string): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, UserRole.TECHNICIAN),
          eq(users.is_active, true),
          ilike(users.specialty, `%${specialty}%`)
        )
      )
      .orderBy(asc(users.name));
    return results as User[];
  }

  async findActiveTechnicians(): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, UserRole.TECHNICIAN), eq(users.is_active, true)))
      .orderBy(asc(users.name));
    return results as User[];
  }

  async create(data: {
    email: string;
    name: string;
    password_hash: string;
    role?: UserRole;
    language?: string;
    tenant_id: string;
  }): Promise<User> {
    const results = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        password_hash: data.password_hash,
        role: data.role || UserRole.CLIENT,
        language: data.language || 'en_US',
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as User;
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'name' | 'email' | 'language' | 'avatar_url'>>): Promise<User | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;

    if (Object.keys(updateData).length === 0) return this.findById(id);

    const results = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return (results[0] as User) || null;
  }

  async verifyEmail(id: string): Promise<void> {
    await db.update(users).set({ email_verified: true }).where(eq(users.id, id));
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ password_hash: passwordHash }).where(eq(users.id, id));
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await db
      .update(users)
      .set({
        last_login_at: sql`NOW()`,
        last_login_ip: ip,
      })
      .where(eq(users.id, id));
  }
}

export const userRepository = new UserRepository();
