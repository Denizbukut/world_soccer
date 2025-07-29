/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'ani-labs.xyz',
      'upload.wikimedia.org',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-e74caca70ffd49459342dd56ea2b67c9.r2.dev',
        port: '', // optional, wenn kein Port
        pathname: '/**', // 🔥 Wichtig, damit alle Pfade erlaubt sind
      },
      {
        protocol: 'https',
        hostname: 'ani-labs.xyz',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
