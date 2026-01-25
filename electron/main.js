"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const os_1 = require("os");
const os_2 = require("os");
const { initializeDatabase } = require('./database.js');
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
const port = process.env.PORT || 3000;
// Configuração do banco de dados
const getAppDataPath = () => {
    const platform = process.platform;
    const homeDir = (0, os_1.homedir)();
    switch (platform) {
        case 'darwin': // macOS
            return (0, path_1.join)(homeDir, 'Library', 'Application Support', 'Ebers');
        case 'win32': // Windows
            return (0, path_1.join)(homeDir, 'AppData', 'Roaming', 'Ebers');
        case 'linux': // Linux
            return (0, path_1.join)(homeDir, '.config', 'Ebers');
        default:
            return (0, path_1.join)(homeDir, '.ebers');
    }
};
const APP_DATA_PATH = getAppDataPath();
const DATABASE_PATH = (0, path_1.join)(APP_DATA_PATH, 'database.db');
// Garantir que o diretório existe
if (!(0, fs_1.existsSync)(APP_DATA_PATH)) {
    (0, fs_1.mkdirSync)(APP_DATA_PATH, { recursive: true });
}
// Configurar variável de ambiente do banco
process.env.DATABASE_URL = `file:${DATABASE_PATH}`;
// Configurar caminho do app para uso no Next.js
if (isDev) {
    process.env.APP_PATH = (0, path_1.join)(__dirname, '..');
}
else {
    const appPath = electron_1.app.getAppPath();
    const isAsar = appPath.includes('.asar');
    process.env.APP_PATH = isAsar ? appPath.replace('app.asar', 'app.asar.unpacked') : appPath;
}
let mainWindow = null;
let nextServer = null;
let nextApp = null;
const createWindow = async () => {
    console.log('Creating main window...');
    // Definir o caminho do ícone baseado no ambiente
    const iconPath = isDev
        ? (0, path_1.join)(__dirname, '..', 'public', 'icons', 'icon.png')
        : (0, path_1.join)(process.resourcesPath, 'app', 'public', 'icons', 'icon.png');
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
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
    }
    catch (error) {
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
                const req = http.get(`http://localhost:${port}`, (res) => {
                    console.log('Next.js server is ready');
                    resolve(true);
                });
                req.on('error', (error) => {
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
        const appPath = electron_1.app.getAppPath();
        const isAsar = appPath.includes('.asar');
        // Se estiver em ASAR, usar o caminho desempacotado
        let nextDir;
        if (isAsar) {
            // Arquivos desempacotados ficam em app.asar.unpacked
            const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
            nextDir = unpackedPath;
            console.log(`Using unpacked path: ${nextDir}`);
        }
        else {
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
        const server = http.createServer((req, res) => {
            handle(req, res);
        });
        // Iniciar servidor
        await new Promise((resolve, reject) => {
            server.listen(port, (err) => {
                if (err) {
                    console.error('Failed to start HTTP server:', err);
                    reject(err);
                }
                else {
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
        nextServer = server;
    }
    catch (error) {
        console.error('Failed to start Next.js server:', error);
        throw error;
    }
};
const initializeDatabaseWrapper = async () => {
    try {
        await initializeDatabase(DATABASE_PATH);
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};
const getNetworkInfo = () => {
    const interfaces = (0, os_2.networkInterfaces)();
    const addresses = [];
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
electron_1.ipcMain.handle('get-network-info', () => {
    return {
        addresses: getNetworkInfo(),
        port: port,
    };
});
electron_1.ipcMain.handle('show-info-dialog', async (_event, message) => {
    if (mainWindow) {
        return electron_1.dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Informação de Rede',
            message: message,
            buttons: ['OK'],
        });
    }
});
// Handler para seleção de pasta para backup
electron_1.ipcMain.handle('select-folder', async () => {
    if (mainWindow) {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
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
// Handler para abrir URL no navegador padrão
electron_1.ipcMain.handle('open-in-browser', async (_event, url) => {
    try {
        await electron_1.shell.openExternal(url);
        return { success: true };
    }
    catch (error) {
        console.error('Erro ao abrir URL no navegador:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
});
// Handler para criação de backup
electron_1.ipcMain.handle('create-backup', async (_event, destinationPath) => {
    try {
        // Verificar se o arquivo do banco existe
        if (!(0, fs_1.existsSync)(DATABASE_PATH)) {
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
        const backupPath = (0, path_1.join)(destinationPath, backupFileName);
        // Copiar o arquivo do banco para o destino
        (0, fs_1.copyFileSync)(DATABASE_PATH, backupPath);
        return {
            success: true,
            fileName: backupFileName,
            filePath: backupPath,
        };
    }
    catch (error) {
        console.error('Erro ao criar backup:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
});
electron_1.app.whenReady().then(async () => {
    try {
        console.log('=== Ebers Application Starting ===');
        console.log(`Platform: ${process.platform}`);
        console.log(`isDev: ${isDev}`);
        console.log(`isPackaged: ${electron_1.app.isPackaged}`);
        console.log(`App path: ${electron_1.app.getAppPath()}`);
        console.log(`Resources path: ${process.resourcesPath}`);
        console.log(`__dirname: ${__dirname}`);
        // Criar menu com opção para abrir DevTools
        const template = [
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
        const menu = electron_1.Menu.buildFromTemplate(template);
        electron_1.Menu.setApplicationMenu(menu);
        // Configurações específicas para macOS
        if (process.platform === 'darwin') {
            electron_1.app.dock.show();
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
    }
    catch (error) {
        console.error('=== Failed to start application ===');
        console.error(error);
        // Mostrar dialog de erro antes de sair
        electron_1.dialog.showErrorBox('Erro ao Iniciar', `Falha ao iniciar a aplicação:\n\n${error instanceof Error ? error.message : String(error)}\n\nVerifique os logs no Console.`);
        electron_1.app.quit();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill?.();
    }
    if (nextApp) {
        nextApp.close?.();
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', async () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
    }
    else if (mainWindow) {
        // Se a janela existe mas não está visível, mostrar e focar
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
    }
});
electron_1.app.on('before-quit', () => {
    if (nextServer) {
        nextServer.kill?.();
    }
    if (nextApp) {
        nextApp.close?.();
    }
});
