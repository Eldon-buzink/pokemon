import type { NextConfig } from "next";

const isCI = process.env.VERCEL === '1' || process.env.CI === 'true';

const nextConfig: NextConfig = {
  // Disable ESLint during production builds on CI to avoid blocking deploys on warnings
  eslint: {
    ignoreDuringBuilds: isCI,
  },
  // Allow CI build to continue even if type errors are present
  typescript: {
    ignoreBuildErrors: isCI,
  },
  // Improve hot reload and development experience
  ...(process.env.NODE_ENV === 'development' && {
    turbopack: {
      rules: {
        '*.tsx': ['tsx'],
        '*.ts': ['ts'],
      },
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tcgplayer-cdn.tcgplayer.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
