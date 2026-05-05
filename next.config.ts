import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source:      '/parlay-builder',
        destination: '/favorites',
        permanent:   true,
      },
    ]
  },
};

export default nextConfig;
