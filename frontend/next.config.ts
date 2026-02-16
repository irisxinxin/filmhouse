import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
    ];
  },
};

export default nextConfig;
