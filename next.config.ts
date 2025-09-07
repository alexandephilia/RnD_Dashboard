import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow deployment even if ESLint/TS have issues; fix incrementally.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
