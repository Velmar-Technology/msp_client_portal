import { hashPassword, comparePassword } from './passwordUtils';
import { describe, it, expect } from 'vitest';

describe('passwordUtils', () => {
  it('should hash a password and correctly compare it', async () => {
    const password = 'mySecurePassword123';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash).toBeDefined();
    
    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);
    
    const isInvalid = await comparePassword('wrongPassword', hash);
    expect(isInvalid).toBe(false);
  });
});
