/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  trailingSlash: true,
  images: {
    // Otimização de imagens habilitada para reduzir tamanho das fotos de pacientes
    unoptimized: false,
    formats: ['image/webp'],
    deviceSizes: [640, 750, 1080],
    imageSizes: [32, 48, 64, 96],
  },
  // Não usar assetPrefix em produção Electron
  // O servidor Next.js já está rodando localmente
}

module.exports = nextConfig
