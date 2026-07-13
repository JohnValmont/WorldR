/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // BACKEND_INTERNAL_URL is set in Vercel dashboard (server-side only).
    // Falls back to localhost for local development.
    const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const dest = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl.replace(/\/$/, '')}/api/v1`;
    return [
      {
        source: '/api/v1/:path*',
        destination: `${dest}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
