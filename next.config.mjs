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
              "img-src 'self' data: https: blob: https://cdn.prod.website-files.com;",
              "frame-src 'self' https://accounts.google.com https://content.googleapis.com;",
              "connect-src 'self' https://accounts.google.com https://apis.google.com https://content.googleapis.com https://www.googleapis.com https://cdn.usefathom.com wss://prod-voice-pgaenaxiea-uc.a.run.app https://prod-voice-pgaenaxiea-uc.a.run.app;",
              "font-src 'self' data:;",
              "media-src 'self' blob:;",
              "worker-src 'self' blob:;",
              "form-action 'self' https://accounts.google.com;",
              "base-uri 'self';",
              "object-src 'none';"
            ].join(' ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
