import { BaseRepository } from '@shared/repositories/BaseRepository';
import { User, UserRole } from '@shared/types';
import { db, users } from '@shared/db';
import { eq, and, or, ilike, asc, desc, sql, count, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(users, 'users');
  }

  private buildFilterConditions(filters: UserListFilters): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(users.is_active, filters.isActive));
    }
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(ilike(users.name, searchPattern), ilike(users.email, searchPattern))!
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  async findAllWithFilters(filters: UserListFilters): Promise<User[]> {
    const whereClause = this.buildFilterConditions(filters);

    const orderFn = filters.sortOrder === 'desc' ? desc : asc;

    let orderByClause;
    switch (filters.sortBy) {
      case 'role':
        orderByClause = orderFn(users.role);
        break;
      case 'client_type':
        orderByClause = orderFn(users.client_type);
        break;
      case 'is_active':
        orderByClause = orderFn(users.is_active);
        break;
      case 'created_at':
        orderByClause = orderFn(users.created_at);
        break;
      default:
        orderByClause = asc(users.name);
    }

    const query = db
      .select()
      .from(users)
      .orderBy(orderByClause)
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);

    if (whereClause) {
      query.where(whereClause);
    }

    const results = await query;
    return results as User[];
  }

  async countWithFilters(filters: UserListFilters): Promise<number> {
    const whereClause = this.buildFilterConditions(filters);
    const query = db.select({ total: count() }).from(users);

    if (whereClause) {
      query.where(whereClause);
    }

    const result = await query;
    return result[0]?.total ?? 0;
  }

  async countByRole(): Promise<Record<string, number>> {
    const results = await db
      .select({ role: users.role, total: count() })
      .from(users)
      .groupBy(users.role);

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.role] = row.total;
    }
    return counts;
  }

  async countByStatus(): Promise<{ active: number; inactive: number }> {
    const [activeResult] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.is_active, true));
    const [inactiveResult] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.is_active, false));

    return {
      active: activeResult?.total ?? 0,
      inactive: inactiveResult?.total ?? 0,
    };
  }

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ role, updated_at: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    return (results[0] as User) || null;
  }

  async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ is_active: isActive, updated_at: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    return (results[0] as User) || null;
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .update(users)
      .set({ is_active: isActive, updated_at: sql`NOW()` })
      .where(inArray(users.id, ids))
      .returning();
    return results.length;
  }

  async bulkUpdateRole(ids: string[], role: UserRole): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .update(users)
      .set({ role, updated_at: sql`NOW()` })
      .where(inArray(users.id, ids))
      .returning();
    return results.length;
  }

  async updateClientType(id: string, clientType: string): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ client_type: clientType, updated_at: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    return (results[0] as User) || null;
  }

  async bulkUpdateClientType(ids: string[], clientType: string): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .update(users)
      .set({ client_type: clientType, updated_at: sql`NOW()` })
      .where(inArray(users.id, ids))
      .returning();
    return results.length;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .delete(users)
      .where(inArray(users.id, ids))
      .returning();
    return results.length;
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

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.phone_number, phoneNumber));
    return (results[0] as User) || null;
  }

  async create(data: {
    email: string;
    name: string;
    password_hash: string;
    role?: UserRole;
    language?: string;
    tenant_id: string;
    client_type?: string;
    phone_number?: string;
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
        client_type: data.client_type || 'CLIENT',
        phone_number: data.phone_number || null,
      })
      .returning();
    return results[0] as User;
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'name' | 'email' | 'language' | 'avatar_url' | 'phone_number'>>): Promise<User | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;

    if (Object.keys(updateData).length === 0) return this.findById(id);

    const results = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return (results[0] as User) || null;
  }

  async verifyEmail(id: string): Promise<void> {
    await db.update(users).set({ 
      email_verified: true,
      otp_code: null,
      otp_expires: null
    }).where(eq(users.id, id));
  }

  async setOTP(id: string, otpCode: string, otpExpires: Date): Promise<void> {
    await db.update(users).set({
      otp_code: otpCode,
      otp_expires: otpExpires
    }).where(eq(users.id, id));
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
