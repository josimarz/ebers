const { join } = require('path');

module.exports = {
  // Configurações do Electron
  electron: {
    main: 'electron/main.js',
    preload: 'electron/preload.js',
  },
  
  // Configurações do Next.js
  nextjs: {
    port: process.env.PORT || 3000,
    dev: process.env.NODE_ENV === 'development',
  },
  
  // Configurações do banco de dados
  database: {
    getPath: () => {
      const { homedir } = require('os');
      const platform = process.platform;
      
      switch (platform) {
        case 'darwin': // macOS
          return join(homedir(), 'Library', 'Application Support', 'Ebers', 'database.db');
        case 'win32': // Windows
          return join(homedir(), 'AppData', 'Roaming', 'Ebers', 'database.db');
        case 'linux': // Linux
          return join(homedir(), '.config', 'Ebers', 'database.db');
        default:
          return join(homedir(), '.ebers', 'database.db');
      }
    },
  },
  
  // Configurações de build
  build: {
    appId: 'com.ebers.app',
    productName: 'Ebers',
    directories: {
      output: 'dist',
    },
    files: [
      'electron/**/*',
      '.next/**/*',
      'public/**/*',
      'lib/db/**/*',
      'node_modules/**/*',
      'package.json',
    ],
  },
};
