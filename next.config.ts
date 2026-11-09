import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
