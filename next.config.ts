import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Separate build dirs let two dev servers run from one checkout (e.g. a second test instance).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  // Server-only packages that must not be bundled into route handlers.
  serverExternalPackages: ['pg', '@prisma/adapter-pg', '@prisma/client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
};

export default nextConfig;
