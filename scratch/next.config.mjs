import path from 'path';
import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const backendInternalUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3000';
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectDir, '..');

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  outputFileTracingRoot: workspaceRoot,
  pageExtensions: ['tsx', 'ts'],
  typescript: {
    // Skip type checking in Docker build (already validated locally)
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === '1',
  },
  eslint: {
    // Skip linting in Docker build
    ignoreDuringBuilds: process.env.SKIP_TYPE_CHECK === '1',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

