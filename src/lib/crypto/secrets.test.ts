import { afterEach, describe, expect, it, vi } from 'vitest';

import { decryptSecret, encryptSecret } from './secrets';

describe('encryptSecret / decryptSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('round-trips arbitrary UTF-8 text', () => {
    vi.stubEnv('APP_SECRETS_KEY', 'unit-test-app-secrets-key-material');
    const plain = 'service-account-json{…}';
    expect(decryptSecret(encryptSecret(plain))).toBe(plain);
  });

  it('throws when APP_SECRETS_KEY is missing', () => {
    delete process.env.APP_SECRETS_KEY;
    expect(() => encryptSecret('x')).toThrow(/APP_SECRETS_KEY/);
  });

  it('decryptSecret throws when payload is not three dot-separated segments', () => {
    vi.stubEnv('APP_SECRETS_KEY', 'unit-test-app-secrets-key-material');
    expect(() => decryptSecret('only-two')).toThrow(/Invalid encrypted payload/);
  });
});
