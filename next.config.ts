import type { NextConfig } from "next";

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
  outputFileTracingRoot: require('path').resolve(__dirname, '../'),
};

export default nextConfig;
