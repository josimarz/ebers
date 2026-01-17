const { execSync } = require('child_process');
const { existsSync } = require('fs');

console.log('🔧 Installing Electron dependencies...');

try {
  // Verificar se as dependências já estão instaladas
  const electronInstalled = existsSync('node_modules/electron');
  const builderInstalled = existsSync('node_modules/electron-builder');
  
  if (electronInstalled && builderInstalled) {
    console.log('✅ Electron dependencies already installed');
    return;
  }
  
  // Instalar dependências do Electron
  console.log('📦 Installing Electron and related packages...');
  
  const devDependencies = [
    'electron@^33.2.1',
    'electron-builder@^25.1.8',
    'concurrently@^9.1.0',
    'wait-on@^8.0.1',
  ];
  
  execSync(`npm install --save-dev ${devDependencies.join(' ')}`, {
    stdio: 'inherit',
  });
  
  console.log('✅ Electron dependencies installed successfully!');
  console.log('');
  console.log('🚀 You can now run:');
  console.log('   npm run electron:dev    # Development mode');
  console.log('   npm run electron:build  # Build for production');
  console.log('   npm run electron        # Run production build');
  console.log('   npm run dist           # Create distributables');
  
} catch (error) {
  console.error('❌ Failed to install Electron dependencies:', error.message);
  process.exit(1);
}