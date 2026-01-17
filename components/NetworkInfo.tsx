"use client";

import { useState, useEffect } from 'react';
import { Wifi, QrCode } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.isElectron);
    
    if (window.electronAPI) {
      window.electronAPI.getNetworkInfo().then(setNetworkInfo);
    }
  }, []);

  const showNetworkDetails = () => {
    if (!networkInfo) return;
    setIsModalOpen(true);
  };

  if (!isElectron || !networkInfo) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={showNetworkDetails}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          title="Informações de rede - QR Code"
        >
          <Wifi size={16} />
          <span className="text-sm">Rede</span>
          <QrCode size={14} />
        </button>
      </div>

      <QRCodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        addresses={networkInfo.addresses}
        port={networkInfo.port}
      />
    </>
  );
}