const { createHash } = require('crypto');
const { readdirSync, readFileSync, writeFileSync, statSync } = require('fs');
const { join, extname } = require('path');

const DIST_DIR = join(__dirname, '..', 'dist');

const calculateChecksum = (filePath) => {
  const fileBuffer = readFileSync(filePath);
  const hashSum = createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const generateChecksums = () => {
  console.log('Gerando checksums dos instaladores...\n');
  
  try {
    const files = readdirSync(DIST_DIR);
    
    // Filtrar apenas arquivos de instalação
    const installerExtensions = ['.dmg', '.zip', '.exe', '.AppImage', '.deb', '.rpm'];
    const installers = files.filter(file => {
      const ext = extname(file);
      return installerExtensions.includes(ext);
    });
    
    if (installers.length === 0) {
      console.log('⚠️  Nenhum instalador encontrado em dist/');
      console.log('Execute primeiro: npm run dist');
      return;
    }
    
    let checksumContent = '# Checksums SHA-256\n\n';
    checksumContent += `Gerado em: ${new Date().toISOString()}\n\n`;
    checksumContent += '| Arquivo | Tamanho | SHA-256 |\n';
    checksumContent += '|---------|---------|----------|\n';
    
    const checksums = [];
    
    for (const file of installers) {
      const filePath = join(DIST_DIR, file);
      const stats = statSync(filePath);
      const checksum = calculateChecksum(filePath);
      const size = formatBytes(stats.size);
      
      checksums.push({
        file,
        size,
        checksum
      });
      
      checksumContent += `| ${file} | ${size} | \`${checksum}\` |\n`;
      
      console.log(`✓ ${file}`);
      console.log(`  Tamanho: ${size}`);
      console.log(`  SHA-256: ${checksum}\n`);
    }
    
    // Salvar em formato Markdown
    const checksumPath = join(DIST_DIR, 'CHECKSUMS.md');
    writeFileSync(checksumPath, checksumContent);
    console.log(`✅ Checksums salvos em: ${checksumPath}`);
    
    // Salvar também em formato texto simples
    let textContent = '';
    for (const { file, checksum } of checksums) {
      textContent += `${checksum}  ${file}\n`;
    }
    
    const textPath = join(DIST_DIR, 'checksums.txt');
    writeFileSync(textPath, textContent);
    console.log(`✅ Checksums salvos em: ${textPath}`);
    
    // Gerar script de verificação
    const verifyScript = `#!/bin/bash
# Script de verificação de checksums
# Uso: ./verify-checksums.sh <arquivo>

if [ -z "$1" ]; then
  echo "Uso: $0 <arquivo>"
  exit 1
fi

FILE="$1"
EXPECTED_CHECKSUM=""

${checksums.map(({ file, checksum }) => 
  `if [ "$FILE" = "${file}" ]; then
  EXPECTED_CHECKSUM="${checksum}"
fi`
).join('\n')}

if [ -z "$EXPECTED_CHECKSUM" ]; then
  echo "❌ Arquivo não encontrado na lista de checksums"
  exit 1
fi

echo "Verificando $FILE..."
ACTUAL_CHECKSUM=$(shasum -a 256 "$FILE" | awk '{print $1}')

if [ "$ACTUAL_CHECKSUM" = "$EXPECTED_CHECKSUM" ]; then
  echo "✅ Checksum válido!"
  exit 0
else
  echo "❌ Checksum inválido!"
  echo "Esperado: $EXPECTED_CHECKSUM"
  echo "Obtido:   $ACTUAL_CHECKSUM"
  exit 1
fi
`;
    
    const verifyScriptPath = join(DIST_DIR, 'verify-checksums.sh');
    writeFileSync(verifyScriptPath, verifyScript, { mode: 0o755 });
    console.log(`✅ Script de verificação salvo em: ${verifyScriptPath}`);
    
    console.log('\n📋 Resumo:');
    console.log(`   ${installers.length} instaladores processados`);
    console.log(`   3 arquivos gerados (CHECKSUMS.md, checksums.txt, verify-checksums.sh)`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar checksums:', error);
    process.exit(1);
  }
};

generateChecksums();
