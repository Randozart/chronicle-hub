import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  async headers() {
    return [
      {
        // Allow the strudel.cc embed iframe to fetch local audio files via AudioContext
        source: '/sounds/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
        bodySizeLimit: '50mb',
    },
    largePageDataBytes: 128 * 100000,
  }
};

export default nextConfig;