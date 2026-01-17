/**
 * @jest-environment jsdom
 */

import { useDeviceDetection, useIPadMode } from '@/lib/hooks/useDeviceDetection';
import { renderHook } from '@testing-library/react';

// Mock window object for testing
const mockWindow = (userAgent: string, isElectron = false) => {
  Object.defineProperty(window, 'navigator', {
    value: { userAgent },
    writable: true,
  });
  
  if (isElectron) {
    (window as any).isElectron = true;
  } else {
    delete (window as any).isElectron;
  }
};

describe('Electron Integration', () => {
  beforeEach(() => {
    // Reset window object
    delete (window as any).isElectron;
  });

  describe('useDeviceDetection', () => {
    it('should detect iPad correctly', () => {
      mockWindow('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.isIPad).toBe(true);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isElectron).toBe(false);
    });

    it('should detect Electron environment', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', true);
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.isElectron).toBe(true);
    });

    it('should detect desktop browser', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.isIPad).toBe(false);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isElectron).toBe(false);
    });
  });

  describe('useIPadMode', () => {
    it('should return true for iPad devices', () => {
      mockWindow('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
      
      const { result } = renderHook(() => useIPadMode());
      
      expect(result.current).toBe(true);
    });

    it('should return true when ipad parameter is in URL', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      
      // Mock window.location.search
      Object.defineProperty(window, 'location', {
        value: { search: '?ipad=true' },
        writable: true,
      });
      
      const { result } = renderHook(() => useIPadMode());
      
      expect(result.current).toBe(true);
    });

    it('should return false for desktop without ipad parameter', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
      
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      });
      
      const { result } = renderHook(() => useIPadMode());
      
      expect(result.current).toBe(false);
    });
  });

  describe('Electron API availability', () => {
    it('should have electronAPI when running in Electron', () => {
      // Mock Electron API
      (window as any).electronAPI = {
        getNetworkInfo: jest.fn(),
        showInfoDialog: jest.fn(),
      };
      
      expect(window.electronAPI).toBeDefined();
      expect(typeof window.electronAPI.getNetworkInfo).toBe('function');
      expect(typeof window.electronAPI.showInfoDialog).toBe('function');
      
      // Cleanup
      delete (window as any).electronAPI;
    });

    it('should not have electronAPI in regular browser', () => {
      // Ensure electronAPI is not defined
      delete (window as any).electronAPI;
      
      expect(window.electronAPI).toBeUndefined();
    });
  });
});