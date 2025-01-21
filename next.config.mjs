/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
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
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://cdn.usefathom.com https://www.gstatic.com;",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com;",
              "img-src 'self' data: https: blob:;",
              "frame-src 'self' https://accounts.google.com https://content.googleapis.com;",
              "connect-src 'self' https://accounts.google.com https://apis.google.com https://content.googleapis.com https://www.googleapis.com;",
              "font-src 'self' https://fonts.gstatic.com;",
              "media-src 'self' blob:;",
              "worker-src 'self' blob:;",
              "form-action 'self' https://accounts.google.com;",
              "base-uri 'self';",
              "object-src 'none';"
            ].join(' '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          }
        ],
      },
    ];
  },
  // Optimization configurations
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
};

export default nextConfig;
