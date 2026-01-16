import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
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

// Configurar caminho do app para uso no Next.js
if (isDev) {
  process.env.APP_PATH = join(__dirname, '..');
} else {
  const appPath = app.getAppPath();
  const isAsar = appPath.includes('.asar');
  process.env.APP_PATH = isAsar ? appPath.replace('app.asar', 'app.asar.unpacked') : appPath;
}

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
let nextApp: any = null;

const createWindow = async () => {
  console.log('Creating main window...');
  
  // Definir o caminho do ícone baseado no ambiente
  const iconPath = isDev 
    ? join(__dirname, '..', 'public', 'icons', 'icon.png')
    : join(process.resourcesPath, 'app', 'public', 'icons', 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false, // Não mostrar até estar pronto
    center: true,
  });

  console.log('BrowserWindow created');

  // Aguardar o servidor Next.js estar pronto
  const url = isDev ? `http://localhost:${port}` : `http://localhost:${port}`;
  
  console.log(`Loading URL: ${url} (isDev: ${isDev})`);
  
  try {
    await mainWindow.loadURL(url);
    console.log('URL loaded successfully');
    
    // Mostrar e focar a janela após carregar
    mainWindow.show();
    mainWindow.focus();
    
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

  // Em produção, iniciar o servidor Next.js programaticamente
  console.log('Production mode: starting Next.js server programmatically...');
  
  try {
    const next = require('next');
    
    // Determinar o caminho correto baseado no empacotamento
    const appPath = app.getAppPath();
    const isAsar = appPath.includes('.asar');
    
    // Se estiver em ASAR, usar o caminho desempacotado
    let nextDir: string;
    if (isAsar) {
      // Arquivos desempacotados ficam em app.asar.unpacked
      const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
      nextDir = unpackedPath;
      console.log(`Using unpacked path: ${nextDir}`);
    } else {
      nextDir = appPath;
      console.log(`Using app path: ${nextDir}`);
    }
    
    console.log(`Starting Next.js on port ${port}...`);
    
    // Criar instância do Next.js
    nextApp = next({
      dev: false,
      dir: nextDir,
      conf: {
        distDir: '.next',
      },
    });
    
    console.log('Preparing Next.js...');
    
    // Preparar o Next.js
    await nextApp.prepare();
    console.log('Next.js prepared successfully');
    
    // Obter o request handler
    const handle = nextApp.getRequestHandler();
    
    // Criar servidor HTTP
    const http = require('http');
    const server = http.createServer((req: any, res: any) => {
      handle(req, res);
    });
    
    // Iniciar servidor
    await new Promise<void>((resolve, reject) => {
      server.listen(port, (err?: Error) => {
        if (err) {
          console.error('Failed to start HTTP server:', err);
          reject(err);
        } else {
          console.log(`✓ Next.js server listening on http://localhost:${port}`);
          resolve();
        }
      });
      
      // Timeout de segurança
      setTimeout(() => {
        reject(new Error('Timeout starting HTTP server'));
      }, 30000);
    });
    
    // Guardar referência ao servidor
    nextServer = server as any;
    
  } catch (error) {
    console.error('Failed to start Next.js server:', error);
    throw error;
  }
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

// Handler para seleção de pasta para backup
ipcMain.handle('select-folder', async () => {
  if (mainWindow) {
    const result: any = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecionar pasta para backup',
    });
    
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      return {
        canceled: false,
        filePath: result.filePaths[0],
      };
    }
    
    return { canceled: true };
  }
  return { canceled: true };
});

// Handler para criação de backup
ipcMain.handle('create-backup', async (_event, destinationPath: string) => {
  try {
    // Verificar se o arquivo do banco existe
    if (!existsSync(DATABASE_PATH)) {
      return {
        success: false,
        error: 'Arquivo do banco de dados não encontrado',
      };
    }

    // Gerar nome do arquivo de backup com timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', 'T');
    
    const backupFileName = `ebers-${timestamp}.db`;
    const backupPath = join(destinationPath, backupFileName);

    // Copiar o arquivo do banco para o destino
    copyFileSync(DATABASE_PATH, backupPath);

    return {
      success: true,
      fileName: backupFileName,
      filePath: backupPath,
    };

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
});

app.whenReady().then(async () => {
  try {
    console.log('=== Ebers Application Starting ===');
    console.log(`Platform: ${process.platform}`);
    console.log(`isDev: ${isDev}`);
    console.log(`isPackaged: ${app.isPackaged}`);
    console.log(`App path: ${app.getAppPath()}`);
    console.log(`Resources path: ${process.resourcesPath}`);
    console.log(`__dirname: ${__dirname}`);
    
    // Criar menu com opção para abrir DevTools
    const template: any = [
      {
        label: 'Ebers',
        submenu: [
          { role: 'about', label: 'Sobre o Ebers' },
          { type: 'separator' },
          { role: 'quit', label: 'Sair' }
        ]
      },
      {
        label: 'Editar',
        submenu: [
          { role: 'undo', label: 'Desfazer' },
          { role: 'redo', label: 'Refazer' },
          { type: 'separator' },
          { role: 'cut', label: 'Recortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Colar' },
          { role: 'selectAll', label: 'Selecionar Tudo' }
        ]
      },
      {
        label: 'Visualizar',
        submenu: [
          { role: 'reload', label: 'Recarregar' },
          { role: 'forceReload', label: 'Forçar Recarregar' },
          { 
            label: 'Abrir DevTools',
            accelerator: 'CmdOrCtrl+Alt+I',
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.openDevTools();
              }
            }
          },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Padrão' },
          { role: 'zoomIn', label: 'Aumentar Zoom' },
          { role: 'zoomOut', label: 'Diminuir Zoom' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Tela Cheia' }
        ]
      },
      {
        label: 'Janela',
        submenu: [
          { role: 'minimize', label: 'Minimizar' },
          { role: 'zoom', label: 'Zoom' },
          { type: 'separator' },
          { role: 'front', label: 'Trazer para Frente' }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    
    // Configurações específicas para macOS
    if (process.platform === 'darwin') {
      app.dock.show();
      console.log('macOS dock shown');
    }
    
    // Inicializar banco de dados
    console.log('Initializing database...');
    await initializeDatabaseWrapper();
    console.log('Database initialized');
    
    // Iniciar servidor Next.js e aguardar estar pronto
    console.log('Starting Next.js server...');
    await startNextServer();
    console.log('Next.js server confirmed ready, creating window...');
    
    // Criar janela principal
    await createWindow();
    
    console.log('=== Application started successfully ===');
    console.log(`Database path: ${DATABASE_PATH}`);
    console.log(`Network addresses: ${getNetworkInfo().join(', ')}`);
  } catch (error) {
    console.error('=== Failed to start application ===');
    console.error(error);
    
    // Mostrar dialog de erro antes de sair
    dialog.showErrorBox(
      'Erro ao Iniciar',
      `Falha ao iniciar a aplicação:\n\n${error instanceof Error ? error.message : String(error)}\n\nVerifique os logs no Console.`
    );
    
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill?.();
  }
  
  if (nextApp) {
    nextApp.close?.();
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
    nextServer.kill?.();
  }
  
  if (nextApp) {
    nextApp.close?.();
  }
});