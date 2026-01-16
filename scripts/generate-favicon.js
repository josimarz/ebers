const sharp = require('sharp');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const PUBLIC_DIR = join(__dirname, '..', 'public');
const PSY_SYMBOL = 'Ψ';

// Função para criar SVG com o símbolo PSY
const createPsySvg = (size) => {
  const fontSize = Math.floor(size * 0.7);
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#197BBD;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#125E8A;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >${PSY_SYMBOL}</text>
    </svg>
  `;
};

const generateFavicon = async () => {
  console.log('Gerando favicons...');
  
  try {
    // Garantir que o diretório existe
    if (!existsSync(PUBLIC_DIR)) {
      mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    
    const baseSvg = Buffer.from(createPsySvg(512));
    
    // Gerar favicon.ico (32x32)
    await sharp(baseSvg)
      .resize(32, 32)
      .png()
      .toFile(join(PUBLIC_DIR, 'favicon-32x32.png'));
    console.log('✓ Gerado: favicon-32x32.png');
    
    // Gerar favicon-16x16.png
    await sharp(baseSvg)
      .resize(16, 16)
      .png()
      .toFile(join(PUBLIC_DIR, 'favicon-16x16.png'));
    console.log('✓ Gerado: favicon-16x16.png');
    
    // Gerar apple-touch-icon.png (180x180)
    await sharp(baseSvg)
      .resize(180, 180)
      .png()
      .toFile(join(PUBLIC_DIR, 'apple-touch-icon.png'));
    console.log('✓ Gerado: apple-touch-icon.png');
    
    // Gerar android-chrome-192x192.png
    await sharp(baseSvg)
      .resize(192, 192)
      .png()
      .toFile(join(PUBLIC_DIR, 'android-chrome-192x192.png'));
    console.log('✓ Gerado: android-chrome-192x192.png');
    
    // Gerar android-chrome-512x512.png
    await sharp(baseSvg)
      .resize(512, 512)
      .png()
      .toFile(join(PUBLIC_DIR, 'android-chrome-512x512.png'));
    console.log('✓ Gerado: android-chrome-512x512.png');
    
    // Gerar site.webmanifest
    const manifest = {
      name: 'Ebers',
      short_name: 'Ebers',
      description: 'Sistema de gerenciamento de pacientes e consultas',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      theme_color: '#197BBD',
      background_color: '#ffffff',
      display: 'standalone'
    };
    
    writeFileSync(
      join(PUBLIC_DIR, 'site.webmanifest'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('✓ Gerado: site.webmanifest');
    
    console.log('\n✅ Todos os favicons foram gerados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar favicons:', error);
    process.exit(1);
  }
};

generateFavicon();
