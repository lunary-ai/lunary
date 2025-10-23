import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // browserDebugInfoInTerminal: true,
  },
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "xyzGOOGLECLIENTIDxyz",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (!process.env.API_URL) {
      return [];
    }

    const redirects = [
      {
        source: "/ingest/:path*",
        destination: "https://app.posthog.com/:path*",
      },
      {
        source: "/api/v1/report",
        destination: process.env.API_URL + "/api/report",
      },
      {
        source: "/api/report",
        destination: process.env.API_URL + "/api/report",
      },
      {
        // This one is for the people on Flowise with the old endpoint saved
        source: "/v1/runs/ingest",
        destination: process.env.API_URL + "/v1/runs/ingest",
      },
      {
        source: "/api/v1/template",
        destination: process.env.API_URL + "/api/v1/template",
      },
    ];

    return redirects;
  },
  transpilePackages: ["shared"],
};

export default withSentryConfig(nextConfig, {
  org: "lunary-0i",
  project: "frontend",

  silent: !process.env.CI,
  useRunAfterProductionCompileHook: true,

  widenClientFileUpload: true,

  disableLogger: true,
  automaticVercelMonitors: true,
});
