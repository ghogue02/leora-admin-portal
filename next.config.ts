import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during builds
    // TODO: Fix all type errors and remove this
    ignoreBuildErrors: true,
  },
  // Only set outputFileTracingRoot in local development
  ...(process.env.VERCEL ? {} : {
    outputFileTracingRoot: path.join(__dirname, '../'),
  }),
};

export default nextConfig;
