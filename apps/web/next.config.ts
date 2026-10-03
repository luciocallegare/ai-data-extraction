import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable automatic .env loading - we rely on Docker Compose passing env vars
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
