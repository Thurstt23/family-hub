import type { NextConfig } from "next";
import path from "node:path";
import './lib/env';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The plan folder above this repo has its own lockfile; pin tracing here.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // Server actions default to a 1MB body; avatars may be up to 10MB and
    // are size-checked in the action itself (08, Phase 4).
    serverActions: { bodySizeLimit: '11mb' },
  },
};

export default nextConfig;
