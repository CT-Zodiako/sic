import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export class PasswordHasher {
  hash(password: string): string {
    if (!password || typeof password !== 'string') throw new Error('Password is required');
    const salt = randomBytes(16).toString('base64url');
    const digest = scryptSync(password, salt, 32).toString('base64url');
    return `scrypt$${salt}$${digest}`;
  }

  verify(password: string, encoded: string): boolean {
    try {
      const [algorithm, salt, expected] = encoded.split('$');
      if (algorithm !== 'scrypt' || !salt || !expected) return false;
      const actual = scryptSync(password, salt, 32);
      const wanted = Buffer.from(expected, 'base64url');
      return actual.length === wanted.length && timingSafeEqual(actual, wanted);
    } catch { return false; }
  }
}
