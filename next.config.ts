import type { NextConfig } from "next";
import path from "node:path";
import './lib/env';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The plan folder above this repo has its own lockfile; pin tracing here.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
