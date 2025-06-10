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
        hostname: 'ani-labs.xyz',
        port: '', // optional, wenn kein Port
        pathname: '/**', // 🔥 Wichtig, damit alle Pfade erlaubt sind
      },
    ],
  },
}

export default nextConfig
