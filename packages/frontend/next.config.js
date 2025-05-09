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

module.exports = nextConfig;
