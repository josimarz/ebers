import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { networkInterfaces } from 'os';

const { initializeDatabase } = require('./database.js');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const port = process.env.PORT || 3000;

// Configuração do banco de dados
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

const APP_DATA_PATH = getAppDataPath();
const DATABASE_PATH = join(APP_DATA_PATH, 'database.db');

// Garantir que o diretório existe
if (!existsSync(APP_DATA_PATH)) {
  mkdirSync(APP_DATA_PATH, { recursive: true });
}

// Configurar variável de ambiente do banco
process.env.DATABASE_URL = `file:${DATABASE_PATH}`;

let mainWindow: BrowserWindow | null = null;
let nextServer: any = null;

const createWindow = async () => {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: true, // Mostrar imediatamente
    center: true, // Centralizar na tela
    alwaysOnTop: false,
    skipTaskbar: false,
    x: undefined, // Deixar o Electron escolher a posição
    y: undefined, // Deixar o Electron escolher a posição
  });

  console.log('BrowserWindow created');

  // Aguardar o servidor Next.js estar pronto
  const url = isDev ? `http://localhost:${port}` : `http://localhost:${port}`;
  
  console.log(`Loading URL: ${url} (isDev: ${isDev})`);
  
  try {
    await mainWindow.loadURL(url);
    console.log('URL loaded successfully');
    
    // Forçar a janela a aparecer e focar
    mainWindow.show();
    mainWindow.focus();
    mainWindow.center(); // Centralizar após carregar
    
    console.log('Window loaded and focused');
    console.log(`Window bounds: ${JSON.stringify(mainWindow.getBounds())}`);
    console.log(`Window visible: ${mainWindow.isVisible()}`);
    console.log(`Window focused: ${mainWindow.isFocused()}`);

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      console.log('Window closed');
      mainWindow = null;
    });
    
    mainWindow.on('show', () => {
      console.log('Window show event fired');
    });
    
    mainWindow.on('focus', () => {
      console.log('Window focus event fired');
    });
    
  } catch (error) {
    console.error('Failed to load URL:', error);
    // Mostrar janela mesmo com erro para debug
    mainWindow.show();
    mainWindow.focus();
    mainWindow.center();
  }
};

const startNextServer = async () => {
  if (isDev) {
    // Em desenvolvimento, verificar se o servidor já está rodando
    console.log('Development mode: checking if Next.js server is running...');
    
    // Aguardar o servidor estar disponível
    await new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60; // 60 segundos máximo
      
      const checkServer = () => {
        attempts++;
        if (attempts > maxAttempts) {
          reject(new Error('Timeout waiting for Next.js server'));
          return;
        }
        
        const http = require('http');
        const req = http.get(`http://localhost:${port}`, (res: any) => {
          console.log('Next.js server is ready');
          resolve(true);
        });
        req.on('error', (error: any) => {
          console.log(`Waiting for Next.js server... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkServer, 1000);
        });
        req.setTimeout(5000, () => {
          req.destroy();
          setTimeout(checkServer, 1000);
        });
      };
      checkServer();
    });
    return;
  }

  // Em produção, iniciar o servidor Next.js
  console.log('Production mode: starting Next.js server...');
  const nextPath = join(__dirname, '..', 'node_modules', '.bin', 'next');
  const nextArgs = ['start', '-p', port.toString()];
  
  nextServer = spawn(nextPath, nextArgs, {
    cwd: join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  nextServer.stdout?.on('data', (data: Buffer) => {
    console.log(`Next.js: ${data.toString()}`);
  });

  nextServer.stderr?.on('data', (data: Buffer) => {
    console.error(`Next.js Error: ${data.toString()}`);
  });

  // Aguardar o servidor estar pronto
  await new Promise((resolve) => {
    const checkServer = () => {
      const http = require('http');
      const req = http.get(`http://localhost:${port}`, (res: any) => {
        console.log('Next.js server is ready');
        resolve(true);
      });
      req.on('error', () => {
        setTimeout(checkServer, 1000);
      });
    };
    checkServer();
  });
};

const initializeDatabaseWrapper = async () => {
  try {
    await initializeDatabase(DATABASE_PATH);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

const getNetworkInfo = () => {
  const interfaces = networkInterfaces();
  const addresses: string[] = [];
  
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (nets) {
      for (const net of nets) {
        // Pular endereços internos e não IPv4
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
  }
  
  return addresses;
};

// IPC Handlers
ipcMain.handle('get-network-info', () => {
  return {
    addresses: getNetworkInfo(),
    port: port,
  };
});

ipcMain.handle('show-info-dialog', async (_event, message: string) => {
  if (mainWindow) {
    return dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Informação de Rede',
      message: message,
      buttons: ['OK'],
    });
  }
});

app.whenReady().then(async () => {
  try {
    // Configurações específicas para macOS
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    
    // Inicializar banco de dados
    await initializeDatabaseWrapper();
    
    // Iniciar servidor Next.js e aguardar estar pronto
    await startNextServer();
    console.log('Next.js server confirmed ready, creating window...');
    
    // Criar janela principal
    await createWindow();
    
    console.log('Application started successfully');
    console.log(`Database path: ${DATABASE_PATH}`);
    console.log(`Network addresses: ${getNetworkInfo().join(', ')}`);
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  } else if (mainWindow) {
    // Se a janela existe mas não está visível, mostrar e focar
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});