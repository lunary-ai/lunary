const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable webpack filesystem cache to avoid missing CssDependency errors
  webpack(config) {
    // Turn off webpack persistent caching
    config.cache = false
    return config
  },
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  }
}

export default nextConfig
