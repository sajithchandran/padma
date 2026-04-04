/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Proxy all /api/* requests to the backend
  // In Docker: BACKEND_INTERNAL_URL = http://backend:3020
  // In local dev: BACKEND_INTERNAL_URL = http://localhost:3020
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3020';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
