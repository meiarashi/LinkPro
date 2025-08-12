/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-beautiful-dndがStrictModeと互換性がないため一時的に無効化
  reactStrictMode: false,
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