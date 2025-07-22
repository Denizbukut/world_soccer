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
        hostname: 'pub-e74caca70ffd49459342dd56ea2b67c9.r2.dev',
        port: '', // optional, wenn kein Port
        pathname: '/**', // 🔥 Wichtig, damit alle Pfade erlaubt sind
      },
      {
        protocol: 'https',
        hostname: 'fda1523f9dc7558ddc4fcf148e01a03a.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
