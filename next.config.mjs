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
              // Default sources
              "default-src 'self';",
              
              // Script sources
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://cdn.usefathom.com https://www.gstatic.com;",
              
              // Style sources
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com;",
              
              // Image sources
              "img-src 'self' data: https: blob: https://cdn.prod.website-files.com;",
              
              // Frame sources
              "frame-src 'self' https://accounts.google.com https://content.googleapis.com;",
              
              // Connect sources - Adding LiveKit and Fixie domains
              "connect-src 'self' https://accounts.google.com https://apis.google.com https://content.googleapis.com https://www.googleapis.com https://cdn.usefathom.com " +
              "wss://prod-voice-pgaenaxiea-uc.a.run.app https://prod-voice-pgaenaxiea-uc.a.run.app " +
              "wss://*.livekit.cloud https://*.livekit.cloud " +
              "https://fixie-test-73wt3hzv.livekit.cloud wss://fixie-test-73wt3hzv.livekit.cloud;",
              
              // Font sources
              "font-src 'self' data: https://fonts.gstatic.com;",
              
              // Media sources
              "media-src 'self' blob:;",
              
              // Worker sources
              "worker-src 'self' blob:;",
              
              // Form action
              "form-action 'self' https://accounts.google.com;",
              
              // Frame ancestors
              "frame-ancestors 'self';",
              
              // Base URI
              "base-uri 'self';",
              
              // Object sources
              "object-src 'none';",
              
              // Manifest sources
              "manifest-src 'self';",
              
              // Websocket connections
              "default-src 'self' wss: ws:;"
            ].join(' ')
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ]
      }
    ];
  },
  // Other Next.js config options
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
};

export default nextConfig;
