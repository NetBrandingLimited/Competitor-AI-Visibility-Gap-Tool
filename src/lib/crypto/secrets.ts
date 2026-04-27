import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.APP_SECRETS_KEY?.trim();
  if (!secret) {
    throw new Error('APP_SECRETS_KEY is required for encrypted connector credentials');
  }
  // Stable 32-byte key derived from env string.
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, bodyB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !bodyB64) {
    throw new Error('Invalid encrypted payload format');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const body = Buffer.from(bodyB64, 'base64');
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]);
  return plain.toString('utf8');
}
