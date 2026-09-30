import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { validateLegalEnvironment } from './src/config/validateLegal';

const nextConfig: NextConfig = {
  // Separate build dirs let two dev servers run from one checkout (e.g. a second test instance).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  // Note: database/auth code runs only in the custom server (server.ts), never in Next bundles.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) validateLegalEnvironment(process.env);
  return nextConfig;
}
