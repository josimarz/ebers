const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');

console.log('🔨 Building Electron application...');

try {
  // 1. Build Next.js application
  console.log('📦 Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Compile TypeScript for Electron
  console.log('🔧 Compiling Electron TypeScript...');
  execSync('npm run build:electron', { stdio: 'inherit' });

  // 3. Copy necessary files
  console.log('📋 Copying necessary files...');
  
  // Ensure electron directory exists
  if (!existsSync('electron')) {
    mkdirSync('electron');
  }

  // Copy database.js if it doesn't exist in compiled output
  if (existsSync('electron/database.js')) {
    console.log('✅ Database module already exists');
  }

  console.log('✅ Electron build completed successfully!');
  console.log('');
  console.log('📱 To run the application:');
  console.log('   npm run electron');
  console.log('');
  console.log('📦 To create distributables:');
  console.log('   npm run dist        (all platforms)');
  console.log('   npm run dist:mac    (macOS only)');
  console.log('   npm run dist:win    (Windows only)');
  console.log('   npm run dist:linux  (Linux only)');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
