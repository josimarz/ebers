import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Configuração para Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
}

export default nextConfig