"use client";

import { useState, useEffect } from 'react';
import { Wifi, QrCode } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface NetworkInfoData {
  addresses: string[];
  port: number;
}

declare global {
  interface Window {
    electronAPI?: {
      getNetworkInfo: () => Promise<NetworkInfoData>;
      showInfoDialog: (message: string) => Promise<void>;
    };
    isElectron?: boolean;
  }
}

/**
 * Determines the path the mobile device should land on.
 * - If the desktop is on a patient edit page → mobile goes to that same page
 * - Otherwise → mobile goes to /patients/new
 */
function getMobilePath(pathname: string): string {
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (/^\/patients\/[^/]+$/.test(normalized) && normalized !== '/patients/new') {
    return normalized;
  }
  return '/patients/new';
}

export function NetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoData | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobilePath, setMobilePath] = useState('/patients/new');

  useEffect(() => {
    setIsElectron(!!window.isElectron);

    if (window.electronAPI) {
      window.electronAPI.getNetworkInfo().then(setNetworkInfo);
    }
  }, []);

  if (!isElectron || !networkInfo) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            setMobilePath(getMobilePath(window.location.pathname));
            setIsModalOpen(true);
          }}
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
        path={mobilePath}
      />
    </>
  );
}
