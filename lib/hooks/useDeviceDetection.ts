"use client";

import { useState, useEffect } from 'react';

interface DeviceInfo {
  isIPad: boolean;
  isMobile: boolean;
  isElectron: boolean;
  userAgent: string;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isIPad: false,
    isMobile: false,
    isElectron: false,
    userAgent: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      
      // Detectar iPad
      const isIPad = /iPad/.test(userAgent) || 
                     (/Macintosh/.test(userAgent) && 'ontouchend' in window);
      
      // Detectar dispositivos móveis em geral
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      // Detectar se está rodando no Electron
      const isElectron = !!(window as any).isElectron;
      
      setDeviceInfo({
        isIPad,
        isMobile,
        isElectron,
        userAgent,
      });
    }
  }, []);

  return deviceInfo;
}

export function useIPadMode(): boolean {
  const { isIPad } = useDeviceDetection();
  const [isIPadMode, setIsIPadMode] = useState(false);

  useEffect(() => {
    // Verificar se há parâmetro 'ipad' na URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasIPadParam = urlParams.has('ipad');
    
    setIsIPadMode(isIPad || hasIPadParam);
  }, [isIPad]);

  return isIPadMode;
}