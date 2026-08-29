import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt with 12 salt rounds.
 *
 * @param password - Plain-text password string
 * @returns Bcrypt hashed string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a bcrypt password hash.
 *
 * @param password - Plain-text password candidate
 * @param hash - Stored bcrypt hash string
 * @returns True if password matches hash, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
