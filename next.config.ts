import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images are served from backend storage, so we don't need Next.js optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
