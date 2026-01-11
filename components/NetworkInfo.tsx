"use client";

import { useState, useEffect } from 'react';
import { Wifi, Info } from 'lucide-react';

interface NetworkInfo {
  addresses: string[];
  port: number;
}

declare global {
  interface Window {
    electronAPI?: {
      getNetworkInfo: () => Promise<NetworkInfo>;
      showInfoDialog: (message: string) => Promise<void>;
    };
    isElectron?: boolean;
  }
}

export function NetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.isElectron);
    
    if (window.electronAPI) {
      window.electronAPI.getNetworkInfo().then(setNetworkInfo);
    }
  }, []);

  const showNetworkDetails = async () => {
    if (!networkInfo || !window.electronAPI) return;

    const message = `
Endereços de rede disponíveis:

${networkInfo.addresses.map(addr => `• http://${addr}:${networkInfo.port}`).join('\n')}

Os pacientes podem acessar o sistema através destes endereços em seus iPads quando conectados à mesma rede Wi-Fi.
    `.trim();

    await window.electronAPI.showInfoDialog(message);
  };

  if (!isElectron || !networkInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={showNetworkDetails}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        title="Informações de rede"
      >
        <Wifi size={16} />
        <span className="text-sm">Rede</span>
        <Info size={14} />
      </button>
    </div>
  );
}