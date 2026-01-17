const sharp = require('sharp');
const { mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const ICON_DIR = join(__dirname, '..', 'public', 'icons');
const PSY_SYMBOL = 'Ψ'; // Símbolo PSY do alfabeto grego

// Garantir que o diretório existe
if (!existsSync(ICON_DIR)) {
  mkdirSync(ICON_DIR, { recursive: true });
}

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

// Tamanhos necessários para diferentes plataformas
const sizes = [
  16, 32, 48, 64, 128, 256, 512, 1024
];

const generateIcons = async () => {
  console.log('Gerando ícones da aplicação...');
  
  try {
    // Gerar ícone base em alta resolução
    const baseSvg = Buffer.from(createPsySvg(1024));
    
    // Gerar PNG em diferentes tamanhos
    for (const size of sizes) {
      const outputPath = join(ICON_DIR, `icon-${size}x${size}.png`);
      await sharp(baseSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Gerado: icon-${size}x${size}.png`);
    }
    
    // Gerar ícone principal
    await sharp(baseSvg)
      .resize(512, 512)
      .png()
      .toFile(join(ICON_DIR, 'icon.png'));
    console.log('✓ Gerado: icon.png');
    
    // Gerar ícone para ICNS (macOS) - precisa ser 1024x1024
    await sharp(baseSvg)
      .resize(1024, 1024)
      .png()
      .toFile(join(ICON_DIR, 'icon-for-icns.png'));
    console.log('✓ Gerado: icon-for-icns.png (para macOS)');
    
    // Gerar ícone para ICO (Windows) - 256x256 é o ideal
    await sharp(baseSvg)
      .resize(256, 256)
      .png()
      .toFile(join(ICON_DIR, 'icon-for-ico.png'));
    console.log('✓ Gerado: icon-for-ico.png (para Windows)');
    
    console.log('\n✅ Todos os ícones foram gerados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error);
    process.exit(1);
  }
};

generateIcons();
