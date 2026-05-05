/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Browser CSP for deployed builds. Omitted in development so Turbopack/Webpack HMR (eval + websockets)
 * is not blocked. Tighten further with nonces via middleware when you can plumb `nonce` into `next/script`.
 *
 * - script/style: Next.js still emits some inline chunks without a nonce pipeline; keep 'unsafe-inline'.
 * - script 'unsafe-eval': required for some Next client bundles in practice; revisit when using strict nonces.
 */
function contentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests'
  ];
  return directives.join('; ');
}

const nextConfig = {
  reactStrictMode: true,
  /** Playwright and local dev hit `127.0.0.1` / `localhost`; without these, HMR can be blocked and client JS may not run. */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.192'],
  async headers() {
    const base = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
      },
      { key: 'X-DNS-Prefetch-Control', value: 'off' }
    ];

    if (isProd) {
      base.push(
        { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains'
        }
      );
    }

    return [
      {
        source: '/:path*',
        headers: base
      }
    ];
  }
};

module.exports = nextConfig;
