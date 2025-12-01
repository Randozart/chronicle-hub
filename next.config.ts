import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all external images for now (MinIO/Cloudinary)
      },
    ],
  },
  // Increase body size limit for uploads
  experimental: {
    serverActions: {
        bodySizeLimit: '10mb',
    }
  }
};

export default nextConfig;