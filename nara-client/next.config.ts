import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'http://apis.data.go.kr/:path*',
      },
    ];
  },
};

export default nextConfig;
