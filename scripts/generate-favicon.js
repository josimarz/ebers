const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  
  try {
    // Gerar um PNG de 32x32 e renomear para .ico
    // (Browsers modernos aceitam PNG com extensão .ico)
    await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    
    console.log('✓ Generated favicon.ico (32x32)');
  } catch (error) {
    console.error('✗ Failed to generate favicon:', error.message);
  }
}

generateFavicon().catch(console.error);