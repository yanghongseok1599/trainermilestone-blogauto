import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/naverb796e97e76c1d7d9c1c7acf0f2c10c8b.html',
        destination: '/api/naver-verify',
      },
    ];
  },
};

export default nextConfig;
