import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
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