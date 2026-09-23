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

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  org: "zuhaibs-world",
  project: "healos-client",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
