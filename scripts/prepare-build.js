const { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const ROOT_DIR = join(__dirname, '..');
const DRIZZLE_DIR = join(ROOT_DIR, 'drizzle');
const ELECTRON_DIR = join(ROOT_DIR, 'electron');
const DIST_DIR = join(ROOT_DIR, 'dist');

const prepareBuild = () => {
  console.log('Preparando build da aplicação...\n');
  
  try {
    // Verificar se as migrations existem
    if (!existsSync(DRIZZLE_DIR)) {
      console.error('❌ Diretório de migrations não encontrado!');
      console.log('Execute: npm run db:generate');
      process.exit(1);
    }
    
    const migrationFiles = readdirSync(DRIZZLE_DIR).filter(f => 
      f.endsWith('.sql') || f === 'meta'
    );
    
    if (migrationFiles.length === 0) {
      console.error('❌ Nenhuma migration encontrada!');
      console.log('Execute: npm run db:generate');
      process.exit(1);
    }
    
    console.log('✓ Migrations encontradas:', migrationFiles.length, 'arquivos');
    
    // Verificar se os ícones existem
    const iconsDir = join(ROOT_DIR, 'public', 'icons');
    if (!existsSync(iconsDir) || readdirSync(iconsDir).length === 0) {
      console.log('⚠ Ícones não encontrados, gerando...');
      require('./generate-icons.js');
    } else {
      console.log('✓ Ícones encontrados');
    }
    
    // Verificar se o código TypeScript do Electron foi compilado
    const mainJsPath = join(ELECTRON_DIR, 'main.js');
    if (!existsSync(mainJsPath)) {
      console.log('⚠ Código Electron não compilado, compilando...');
      const { execSync } = require('child_process');
      execSync('npm run build:electron', { stdio: 'inherit' });
    } else {
      console.log('✓ Código Electron compilado');
    }
    
    // Verificar se o Next.js foi buildado
    const nextDir = join(ROOT_DIR, '.next');
    if (!existsSync(nextDir)) {
      console.log('⚠ Build do Next.js não encontrado, buildando...');
      const { execSync } = require('child_process');
      execSync('npm run build', { stdio: 'inherit' });
    } else {
      console.log('✓ Build do Next.js encontrado');
    }
    
    console.log('\n✅ Preparação concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('  - Para macOS: npm run dist:mac');
    console.log('  - Para Windows: npm run dist:win');
    console.log('  - Para Linux: npm run dist:linux');
    console.log('  - Para todas: npm run dist');
    
  } catch (error) {
    console.error('❌ Erro ao preparar build:', error);
    process.exit(1);
  }
};

prepareBuild();
