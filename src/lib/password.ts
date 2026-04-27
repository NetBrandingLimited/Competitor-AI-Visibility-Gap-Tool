import bcrypt from 'bcryptjs';

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, passwordHash: string | null | undefined): boolean {
  if (!passwordHash) {
    return false;
  }
  return bcrypt.compareSync(plain, passwordHash);
}
