const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
  showInfoDialog: (message) => ipcRenderer.invoke('show-info-dialog', message),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  createBackup: (destinationPath) => ipcRenderer.invoke('create-backup', destinationPath),
  openInBrowser: (url) => ipcRenderer.invoke('open-in-browser', url),
});

// Adicionar informações sobre o ambiente Electron
contextBridge.exposeInMainWorld('isElectron', true);