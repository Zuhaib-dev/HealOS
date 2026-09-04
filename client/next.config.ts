import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/developers",
        permanent: false,
      },
      {
        source: "/api-reference",
        destination: "/developers",
        permanent: false,
      },
      {
        source: "/console",
        destination: "/developers",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
