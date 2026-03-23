import type { NextConfig } from "next";
import dns from "dns";

// Fix ENOTFOUND on Windows - force IPv4 DNS resolution
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
