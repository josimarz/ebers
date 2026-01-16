const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const getAppDataPath = () => {
  const platform = process.platform;
  const homeDir = homedir();
  
  switch (platform) {
    case 'darwin': // macOS
      return join(homeDir, 'Library', 'Application Support', 'Ebers');
    case 'win32': // Windows
      return join(homeDir, 'AppData', 'Roaming', 'Ebers');
    case 'linux': // Linux
      return join(homeDir, '.config', 'Ebers');
    default:
      return join(homeDir, '.ebers');
  }
};

const postInstall = () => {
  console.log('Executando configuração pós-instalação...\n');
  
  try {
    const appDataPath = getAppDataPath();
    
    // Criar diretório da aplicação se não existir
    if (!existsSync(appDataPath)) {
      mkdirSync(appDataPath, { recursive: true });
      console.log('✓ Diretório da aplicação criado:', appDataPath);
    } else {
      console.log('✓ Diretório da aplicação já existe:', appDataPath);
    }
    
    // Criar arquivo de configuração inicial se não existir
    const configPath = join(appDataPath, 'config.json');
    if (!existsSync(configPath)) {
      const defaultConfig = {
        version: '1.0.0',
        firstRun: true,
        createdAt: new Date().toISOString()
      };
      
      writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('✓ Arquivo de configuração criado');
    }
    
    console.log('\n✅ Configuração pós-instalação concluída!');
    console.log('\nCaminho dos dados da aplicação:', appDataPath);
    
  } catch (error) {
    console.error('❌ Erro na configuração pós-instalação:', error);
    // Não falhar a instalação por causa disso
  }
};

postInstall();
