import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    authInterrupts: true,
  },
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
