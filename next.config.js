/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Playwright and local dev hit `127.0.0.1` / `localhost`; without these, HMR can be blocked and client JS may not run. */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.192'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
