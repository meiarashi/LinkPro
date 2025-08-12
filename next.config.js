/** @type {import('next').NextConfig} */
const nextConfig = {
  // @hello-pangea/dndはStrictModeに対応しているため有効化
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig 