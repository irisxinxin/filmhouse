import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [128, 256, 384],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.railway.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-production-113d.up.railway.app/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'https://backend-production-113d.up.railway.app/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
