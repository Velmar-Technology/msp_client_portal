import { BaseRepository } from '@shared/repositories/BaseRepository';
import { User, UserRole, CachePort } from '@shared/types';
import { db, users } from '@shared/db';
import { eq, and, or, ilike, asc, desc, sql, count, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { cacheManager } from '@shared/utils/cache';

export interface UserListFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Data repository for user accounts, role definitions, status mutations,
 * technician queries, and authentication metadata with versioned Redis caching.
 */
export class UserRepository extends BaseRepository<User> {
  /**
   * Initializes UserRepository with the CachePort abstraction.
   *
   * @param cache - Distributed cache instance with version tracking
   */
  constructor(private cache: CachePort = cacheManager) {
    super(users, 'users');
  }

  /**
   * Retrieves a user entity by primary ID using versioned global cache.
   *
   * @param id - Unique user identifier
   * @returns User entity or null if not found
   */
  override async findById(id: string): Promise<User | null> {
    if (!id) return null;

    return this.cache.wrapVersioned<User | null>(
      'users',
      'global',
      `id:${id}`,
      1800,
      () => super.findById(id)
    );
  }

  /**
   * Constructs dynamic Drizzle SQL filter conditions based on filter options.
   *
   * @param filters - Search, role, and activation status filters
   * @returns SQL WHERE condition clause or undefined if no filters active
   */
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

  /**
   * Retrieves a paginated list of users matching specified filter and sorting criteria.
   *
   * @param filters - Search term, role, active status, pagination and sort parameters
   * @returns Array of matching user records
   */
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

  /**
   * Counts the total number of users matching filter criteria for pagination calculation.
   *
   * @param filters - Active filter parameters
   * @returns Total count of matching users
   */
  async countWithFilters(filters: UserListFilters): Promise<number> {
    const whereClause = this.buildFilterConditions(filters);
    const query = db.select({ total: count() }).from(users);

    if (whereClause) {
      query.where(whereClause);
    }

    const result = await query;
    return result[0]?.total ?? 0;
  }

  /**
   * Aggregates total user count grouped by system role.
   *
   * @returns Record mapping role name to user count
   */
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

  /**
   * Counts active vs inactive user accounts across the platform.
   *
   * @returns Breakdown of active and inactive user totals
   */
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

  /**
   * Updates an individual user's system role and invalidates cached user entities.
   *
   * @param id - Target user ID
   * @param role - Target UserRole value
   * @returns Updated user entity or null if not found
   */
  async updateRole(id: string, role: UserRole): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ role, updated_at: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return (results[0] as User) || null;
  }

  /**
   * Updates the active/disabled status of a user.
   *
   * @param id - Target user ID
   * @param isActive - New activation status
   * @returns Updated user entity or null if not found
   */
  async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ is_active: isActive, updated_at: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return (results[0] as User) || null;
  }

  /**
   * Updates active status for multiple users in a single transaction.
   *
   * @param ids - Array of target user IDs
   * @param isActive - New activation status
   * @returns Count of records updated
   */
  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .update(users)
      .set({ is_active: isActive, updated_at: sql`NOW()` })
      .where(inArray(users.id, ids))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return results.length;
  }

  /**
   * Updates role for multiple users in bulk.
   *
   * @param ids - Array of target user IDs
   * @param role - New target UserRole
   * @returns Count of records updated
   */
  async bulkUpdateRole(ids: string[], role: UserRole): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .update(users)
      .set({ role, updated_at: sql`NOW()` })
      .where(inArray(users.id, ids))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return results.length;
  }

  /**
   * Updates the client type classification for an individual user.
   *
   * @param id - Target user ID
   * @param clientType - New client type string (e.g. VIP, STANDARD)
   * @returns Updated user entity or null
   */
  async updateClientType(id: string, clientType: string): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ client_type: clientType, updated_at: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return (results[0] as User) || null;
  }

  /**
   * Updates client type for multiple users in bulk.
   *
   * @param ids - Array of target user IDs
   * @param clientType - New client type classification
   * @returns Count of records updated
   */
  async bulkUpdateClientType(ids: string[], clientType: string): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .update(users)
      .set({ client_type: clientType, updated_at: sql`NOW()` })
      .where(inArray(users.id, ids))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return results.length;
  }

  /**
   * Deletes multiple user accounts by their IDs.
   *
   * @param ids - Array of user IDs to remove
   * @returns Count of records deleted
   */
  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await db
      .delete(users)
      .where(inArray(users.id, ids))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return results.length;
  }

  /**
   * Finds a user record by email address using cached lookup.
   *
   * @param email - Target user email
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.cache.wrapVersioned<User | null>(
      'users',
      'global',
      `email:${email.toLowerCase().trim()}`,
      1800,
      async () => {
        const results = await db.select().from(users).where(eq(users.email, email));
        return (results[0] as User) || null;
      }
    );
  }

  /**
   * Finds all active users with a specified role.
   *
   * @param role - Desired UserRole
   * @returns Array of matching active users
   */
  async findByRole(role: UserRole): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, role), eq(users.is_active, true)))
      .orderBy(asc(users.name));
    return results as User[];
  }

  /**
   * Finds all active client users belonging to a specific tenant.
   *
   * @param tenantId - Target tenant ID
   * @returns Array of active client users
   */
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

  /**
   * Finds all active client users across the system.
   *
   * @returns Array of active client users
   */
  async findAllClients(): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, UserRole.CLIENT), eq(users.is_active, true)))
      .orderBy(asc(users.name));
    return results as User[];
  }

  /**
   * Finds active technicians specializing in a specific domain.
   *
   * @param specialty - Required technician specialty domain
   * @returns Array of active technicians matching the specialty
   */
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

  /**
   * Finds all active technician users available for ticket assignment.
   *
   * @returns Array of active technicians
   */
  async findActiveTechnicians(): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.role, UserRole.TECHNICIAN), eq(users.is_active, true)))
      .orderBy(asc(users.name));
    return results as User[];
  }

  /**
   * Finds all technicians regardless of active status.
   *
   * @returns Array of all technicians
   */
  async findAllTechnicians(): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.role, UserRole.TECHNICIAN))
      .orderBy(asc(users.name));
    return results as User[];
  }

  /**
   * Finds a user by registered phone number.
   *
   * @param phoneNumber - International format phone number
   * @returns User entity or null if not found
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.phone_number, phoneNumber));
    return (results[0] as User) || null;
  }

  /**
   * Inserts a new user record into the database and invalidates user cache.
   *
   * @param data - User creation attributes
   * @returns Created user entity
   */
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

    await this.cache.invalidateScope('users', 'global');
    return results[0] as User;
  }

  /**
   * Updates profile attributes (name, email, language, avatar, phone number) for a user.
   *
   * @param id - Target user ID
   * @param data - Profile fields to modify
   * @returns Updated user entity or null
   */
  async updateProfile(id: string, data: Partial<Pick<User, 'name' | 'email' | 'language' | 'avatar_url' | 'phone_number' | 'rnc'>>): Promise<User | null> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
    if (data.rnc !== undefined) updateData.rnc = data.rnc;

    if (Object.keys(updateData).length === 0) return this.findById(id);

    const results = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    await this.cache.invalidateScope('users', 'global');
    return (results[0] as User) || null;
  }

  /**
   * Marks a user's email as verified and clears any pending OTP challenge.
   *
   * @param id - Target user ID
   */
  async verifyEmail(id: string): Promise<void> {
    await db.update(users).set({ 
      email_verified: true,
      otp_code: null,
      otp_expires: null
    }).where(eq(users.id, id));
    await this.cache.invalidateScope('users', 'global');
  }

  /**
   * Sets the one-time password code and expiration timestamp for a user.
   *
   * @param id - Target user ID
   * @param otpCode - 6-digit OTP string
   * @param otpExpires - Timestamp after which OTP is invalid
   */
  async setOTP(id: string, otpCode: string, otpExpires: Date): Promise<void> {
    await db.update(users).set({
      otp_code: otpCode,
      otp_expires: otpExpires
    }).where(eq(users.id, id));
    await this.cache.invalidateScope('users', 'global');
  }

  /**
   * Updates a user's hashed password and invalidates cached data.
   *
   * @param id - Target user ID
   * @param passwordHash - Bcrypt hash of the new password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ password_hash: passwordHash }).where(eq(users.id, id));
    await this.cache.invalidateScope('users', 'global');
  }

  /**
   * Records the last login timestamp and remote IP address for security auditing.
   *
   * @param id - Target user ID
   * @param ip - Remote client IP address
   */
  async updateLastLogin(id: string, ip: string): Promise<void> {
    await db
      .update(users)
      .set({
        last_login_at: sql`NOW()`,
        last_login_ip: ip,
      })
      .where(eq(users.id, id));
    await this.cache.invalidateScope('users', 'global');
  }

  /**
   * Updates the account status for a specific user.
   *
   * @param userId - Target user ID
   * @param status - Target AccountStatus
   * @param isActive - Optional boolean to update is_active
   */
  async updateAccountStatus(userId: string, status: any, isActive?: boolean): Promise<User | null> {
    const updateData: Record<string, any> = {
      account_status: status,
      updated_at: new Date(),
    };
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    const results = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return (results[0] as User) || null;
  }

  /**
   * Updates the account status and active state for all users belonging to a tenant organization.
   *
   * @param tenantId - Target tenant UUID
   * @param status - Target AccountStatus
   * @param isActive - Optional boolean to update is_active
   */
  async updateAccountStatusByTenant(tenantId: string, status: any, isActive?: boolean): Promise<void> {
    const updateData: Record<string, any> = {
      account_status: status,
      updated_at: new Date(),
    };
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.tenant_id, tenantId));
    await this.cache.invalidateScope('users', 'global');
  }

  /**
   * Updates the official tax RNC number for a user profile.
   *
   * @param userId - Target user ID
   * @param rnc - Dominican RNC string
   */
  async updateRnc(userId: string, rnc: string | null): Promise<User | null> {
    const results = await db
      .update(users)
      .set({ rnc, updated_at: new Date() })
      .where(eq(users.id, userId))
      .returning();
    await this.cache.invalidateScope('users', 'global');
    return (results[0] as User) || null;
  }
}

export const userRepository = new UserRepository();


