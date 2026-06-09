// next.config.ts
import type { NextConfig } from 'next';

const frameAncestors =
  "frame-ancestors 'self' https://ugcsuomi.fi https://www.ugcsuomi.fi https://ugc.visioreach.fi;";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: frameAncestors },
        ],
      },
    ];
  },
};

export default nextConfig;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'videodelivery.net' },
      { hostname: '*.cloudflarestream.com' },
    ],
  },
  // Allow cross-origin prefetch for video delivery
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
