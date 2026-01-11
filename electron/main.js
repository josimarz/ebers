"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const child_process_1 = require("child_process");
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
let mainWindow = null;
let nextServer = null;
const createWindow = async () => {
    console.log('Creating main window...');
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
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
    }
    catch (error) {
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
    // Em produção, iniciar o servidor Next.js
    console.log('Production mode: starting Next.js server...');
    const nextPath = (0, path_1.join)(__dirname, '..', 'node_modules', '.bin', 'next');
    const nextArgs = ['start', '-p', port.toString()];
    nextServer = (0, child_process_1.spawn)(nextPath, nextArgs, {
        cwd: (0, path_1.join)(__dirname, '..'),
        env: {
            ...process.env,
            NODE_ENV: 'production',
        },
    });
    nextServer.stdout?.on('data', (data) => {
        console.log(`Next.js: ${data.toString()}`);
    });
    nextServer.stderr?.on('data', (data) => {
        console.error(`Next.js Error: ${data.toString()}`);
    });
    // Aguardar o servidor estar pronto
    await new Promise((resolve) => {
        const checkServer = () => {
            const http = require('http');
            const req = http.get(`http://localhost:${port}`, (res) => {
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
electron_1.app.whenReady().then(async () => {
    try {
        // Configurações específicas para macOS
        if (process.platform === 'darwin') {
            electron_1.app.dock.show();
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
    }
    catch (error) {
        console.error('Failed to start application:', error);
        electron_1.app.quit();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill();
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
        nextServer.kill();
    }
});
