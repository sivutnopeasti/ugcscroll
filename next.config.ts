// next.config.ts
import type { NextConfig } from 'next';

const frameAncestors =
  "frame-ancestors 'self' https://ugcsuomi.fi https://www.ugcsuomi.fi https://ugc.visioreach.fi;";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'videodelivery.net' },
      { hostname: '*.cloudflarestream.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // POISTETTU: X-Frame-Options: DENY (esti upotuksen)
          // Sallitaan upotus ugcsuomi.fi:stä:
          { key: 'Content-Security-Policy', value: frameAncestors },
        ],
      },
    ];
  },
};

export default nextConfig;
