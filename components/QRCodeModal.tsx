"use client";

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from './ui/Modal';
import { Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: string[];
  port: number;
}

export function QRCodeModal({ isOpen, onClose, addresses, port }: QRCodeModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress]);

  useEffect(() => {
    if (selectedAddress && isOpen) {
      const url = `http://${selectedAddress}:${port}`;
      QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [selectedAddress, port, isOpen]);

  const copyToClipboard = async (address: string, index: number) => {
    const url = `http://${address}:${port}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acesso via QR Code" size="md">
      <div className="space-y-6">
        {/* Seletor de endereço */}
        {addresses.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o endereço de rede:
            </label>
            <select
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {addresses.map((address) => (
                <option key={address} value={address}>
                  {address}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center space-y-4">
          {qrCodeDataUrl && (
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code para acesso ao sistema"
                className="w-64 h-64"
              />
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Escaneie o QR Code com o iPad para acessar o sistema
            </p>
            <p className="text-xs text-gray-500">
              URL: http://{selectedAddress}:{port}
            </p>
          </div>
        </div>

        {/* Lista de endereços */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Endereços disponíveis:
          </h3>
          <div className="space-y-2">
            {addresses.map((address, index) => {
              const url = `http://${address}:${port}`;
              return (
                <div
                  key={address}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-mono text-gray-800">{url}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(address, index)}
                    className="ml-2 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Copiar URL"
                  >
                    {copiedIndex === index ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Como usar:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Certifique-se de que o iPad está conectado à mesma rede Wi-Fi</li>
            <li>• Abra a câmera do iPad ou um leitor de QR Code</li>
            <li>• Aponte para o QR Code acima</li>
            <li>• Toque no link que aparecer para abrir o sistema</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}