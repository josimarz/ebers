"use client";

import { useState, useEffect } from 'react';
import { Download, FolderOpen, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/lib/toast-context';

export default function BackupPage() {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Verificar se estamos no Electron
    const checkElectron = () => {
      const isElectronEnv = !!(window as any).isElectron;
      const hasElectronAPI = !!(window as any).electronAPI;
      const hasSelectFolder = !!(window as any).electronAPI?.selectFolder;
      const hasCreateBackup = !!(window as any).electronAPI?.createBackup;
      
      setIsElectronAvailable(hasElectronAPI && hasSelectFolder && hasCreateBackup);
    };

    checkElectron();
    
    // Verificar novamente após um pequeno delay caso o Electron ainda esteja carregando
    const timer = setTimeout(checkElectron, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSelectFolder = async () => {
    if (!isElectronAvailable) {
      // Fallback para navegador web - usar input file
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          // Pegar o caminho da primeira pasta
          const path = files[0].webkitRelativePath.split('/')[0];
          setSelectedPath(path);
          showToast('Pasta selecionada com sucesso', 'success');
        }
      };
      input.click();
      return;
    }

    try {
      const result = await (window as any).electronAPI.selectFolder();
      
      if (result && !result.canceled && result.filePath) {
        setSelectedPath(result.filePath);
        showToast('Pasta selecionada com sucesso', 'success');
      }
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error);
      showToast('Erro ao selecionar pasta de destino', 'error');
    }
  };

  const handleBackup = async () => {
    if (!selectedPath) {
      showToast('Selecione uma pasta de destino primeiro', 'warning');
      return;
    }

    setIsBackingUp(true);
    
    try {
      if (isElectronAvailable) {
        const result = await (window as any).electronAPI.createBackup(selectedPath);
        
        if (result && result.success) {
          showToast(`Backup criado com sucesso: ${result.fileName}`, 'success', 7000);
        } else {
          showToast(`Erro ao criar backup: ${result?.error || 'Erro desconhecido'}`, 'error');
        }
      } else {
        // Fallback para navegador web - usar API route
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ destinationPath: selectedPath }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          showToast(`Backup criado com sucesso: ${result.fileName}`, 'success', 7000);
        } else {
          showToast(`Erro ao criar backup: ${result.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      showToast('Erro inesperado ao criar backup', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-4">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-white" />
            <h1 className="text-xl font-bold text-white">Backup do Sistema</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status do Electron */}
          {!isElectronAvailable && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-yellow-900 mb-1">Modo Web:</h3>
                  <p className="text-sm text-yellow-800">
                    Você está executando no navegador web. A funcionalidade de backup está disponível, 
                    mas com limitações na seleção de pastas. Para melhor experiência, use o aplicativo desktop.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Crie uma cópia de segurança do banco de dados do sistema. O backup incluirá todos os dados de pacientes, consultas e informações financeiras.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Informações importantes:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• O backup será salvo com o nome no formato: ebers-AAAA-MM-DDTHHMMSS.db</li>
                    <li>• Recomendamos fazer backups regulares para proteger seus dados</li>
                    <li>• O processo pode levar alguns segundos dependendo do tamanho do banco</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Folder Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pasta de Destino
            </label>
            <div className="flex space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={selectedPath}
                  readOnly
                  placeholder="Selecione uma pasta para salvar o backup..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSelectFolder}
                disabled={isBackingUp}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Selecionar</span>
              </button>
            </div>
          </div>

          {/* Backup Button */}
          <div className="flex justify-center">
            <button
              onClick={handleBackup}
              disabled={!selectedPath || isBackingUp}
              className="px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-3 text-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isBackingUp ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Criando Backup...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Criar Backup</span>
                </>
              )}
            </button>
          </div>

          {/* Status */}
          {selectedPath && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">
                  Pasta selecionada: <span className="font-medium">{selectedPath}</span>
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}