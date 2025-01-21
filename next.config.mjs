/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        pathname: '/**',
      },
      // Adding common image hosting domains that might be useful
      {
        protocol: 'https',
        hostname: 'accounts.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'apis.google.com',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' data: https: blob:",
              "frame-src 'self' https://accounts.google.com",
              "connect-src 'self' https://accounts.google.com https://apis.google.com",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Adding additional security configurations
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true,
  // Optimize production builds
  swcMinify: true,
  // Enable compression
  compress: true,
  // Configure redirects if needed
  async redirects() {
    return [];
  },
  // Configure rewrites if needed
  async rewrites() {
    return [];
  },
  // Enable experimental features if needed
  experimental: {
    // Enable React Server Components
    serverComponents: true,
    // Enable concurrent features
    concurrentFeatures: true,
  },
};

export default nextConfig;