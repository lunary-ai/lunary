import { withSentryConfig } from "@sentry/nextjs";
import config from "./utils/config";

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
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

const sentryConfig = withSentryConfig(baseConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "lunary-5a",
  project: "production",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,

  reactComponentAnnotation: {
    enabled: true,
  },
});

export default config.IS_CLOUD ? sentryConfig : baseConfig;
