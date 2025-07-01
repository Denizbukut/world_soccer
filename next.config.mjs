/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'https://pub-e74caca70ffd49459342dd56ea2b67c9.r2.dev',
        port: '', // optional, wenn kein Port
        pathname: '/**', // 🔥 Wichtig, damit alle Pfade erlaubt sind
      },
    ],
  },
}

export default nextConfig
