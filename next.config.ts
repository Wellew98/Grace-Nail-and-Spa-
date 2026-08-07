import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Route handlers do the writing; keep server-only packages out of the client graph.
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
