import type { NextConfig } from "next";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {},
};

export default nextConfig;
