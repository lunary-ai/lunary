const { withSentryConfig } = require("@sentry/nextjs")

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async rewrites() {
    if (!process.env.API_URL) {
      return []
    }

    return [
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
        source: "/api/v1/template",
        destination: process.env.API_URL + "/api/v1/template",
      },
    ]
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
      }),
    )

    return config
  },
  transpilePackages: ["shared"],
}

const sentryWebpackPluginOptions = {
  org: "lunary-9r",
  project: "node-koa",
  // An auth token is required for uploading source maps.
  // authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, // Suppresses all logs
}

module.exports =
  process.env.NEXT_PUBLIC_IS_SELF_HOSTED === 'true' || process.env.CI
    ? nextConfig
    : withSentryConfig(nextConfig, sentryWebpackPluginOptions)
