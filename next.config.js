/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Playwright and local dev hit `127.0.0.1` / `localhost`; without these, HMR can be blocked and client JS may not run. */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.192']
};

module.exports = nextConfig;
