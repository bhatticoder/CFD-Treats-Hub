import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.54.7.123"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
};

export default nextConfig;
