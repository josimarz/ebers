/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Não usar assetPrefix em produção Electron
  // O servidor Next.js já está rodando localmente
}

module.exports = nextConfig
