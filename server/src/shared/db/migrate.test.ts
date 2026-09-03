import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { ensureAdminExists } from './migrate';

// Mock the dependencies
vi.mock('@shared/config/env', () => {
  return {
    env: {
      ADMIN_EMAIL: 'testadmin@example.com',
      ADMIN_PASSWORD: 'testpassword123',
    },
  };
});

describe('ensureAdminExists', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
    } as unknown as PoolClient;
  });

  it('should do nothing if an admin already exists', async () => {
    // Mock set_config + check admin (returns 1 row, admin exists)
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ '1': 1 }] });

    await ensureAdminExists(mockClient);

    expect(mockClient.query).toHaveBeenCalledTimes(2);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      1,
      "SELECT set_config('app.is_system_admin', 'true', false)"
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      "SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1"
    );
  });

  it('should upgrade existing user to ADMIN if they exist but are not an admin', async () => {
    // 0. Set config
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 1. Check admin: returns 0 rows
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 2. Check default tenant: returns 1 row
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'tenant-123' }] });
    // 3. Check user by email: returns 1 row with role 'CLIENT'
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'user-456', role: 'CLIENT' }] });
    // 4. Update user: mock successful update
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    await ensureAdminExists(mockClient);

    expect(mockClient.query).toHaveBeenCalledTimes(5);
    
    // Check update query
    expect(mockClient.query).toHaveBeenNthCalledWith(
      5,
      "UPDATE users SET role = 'ADMIN' WHERE id = $1",
      ['user-456']
    );
  });

  it('should create default tenant and new admin user if neither exists', async () => {
    // 0. Set config
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 1. Check admin: returns 0 rows
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 2. Check default tenant: returns 0 rows (no tenant)
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 3. Insert tenant: returns 0 rows/mock success
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 4. Check user by email: returns 0 rows (no user)
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // 5. Insert user: mock successful insert
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    const bcryptHashSpy = vi.spyOn(bcrypt, 'hash');

    await ensureAdminExists(mockClient);

    expect(mockClient.query).toHaveBeenCalledTimes(6);

    // Check insert tenant query
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      "INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)",
      ['ef010203-0405-0607-0809-0a0b0c0d0e0f', 'MSP Provider', 'admin']
    );

    // Check bcrypt was called with the environment variable password
    expect(bcryptHashSpy).toHaveBeenCalledWith('testpassword123', 12);

    // Check insert user query
    expect(mockClient.query).toHaveBeenNthCalledWith(
      6,
      "INSERT INTO users (email, name, password_hash, role, tenant_id, is_active, email_verified) VALUES ($1, $2, $3, 'ADMIN', $4, true, true)",
      [
        'testadmin@example.com',
        'System Administrator',
        expect.any(String),
        'ef010203-0405-0607-0809-0a0b0c0d0e0f',
      ]
    );
  });
});
