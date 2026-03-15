/**
 * System Integration Tests
 * Tests the complete system integration including proxy, navigation, and device detection
 */

import { proxy } from '../proxy'
import { isMobileDevice, isIpadDevice } from '../lib/device-detection'

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ status: 200, type: 'next', cookies: { set: jest.fn() } })),
    rewrite: jest.fn((url: URL) => ({ 
      status: 200, 
      type: 'rewrite',
      url: url.toString(),
      cookies: { set: jest.fn() }
    }))
  }
}))

import { NextResponse } from 'next/server'

const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

function createMockRequest(pathname: string, userAgent: string) {
  const url = `http://localhost:3000${pathname}`
  return {
    nextUrl: {
      pathname,
      clone: jest.fn(() => ({
        pathname,
        searchParams: new URLSearchParams(),
        toString: () => url
      }))
    },
    url,
    headers: {
      get: jest.fn((key: string) =>
        key === 'user-agent' ? userAgent : null
      )
    }
  } as any
}

describe('System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Device Detection and Navigation Flow', () => {
    it('should properly detect mobile devices and rewrite to registration', () => {
      const mockRequest = createMockRequest('/patients', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.rewrite).toHaveBeenCalled()
    })

    it('should allow desktop users normal navigation', () => {
      const mockRequest = createMockRequest('/patients', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('should allow mobile users to access patient registration, edit, and API routes', () => {
      const allowedPaths = [
        '/patients/new',
        '/patients/abc123',
        '/api/patients',
        '/api/patients/123'
      ]

      allowedPaths.forEach(pathname => {
        jest.clearAllMocks()
        const mockRequest = createMockRequest(pathname, 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
        proxy(mockRequest)
        
        expect(mockNextResponse.next).toHaveBeenCalled()
        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
      })
    })
  })

  describe('Device Detection Utility', () => {
    it('should correctly identify mobile devices', () => {
      const mobileUserAgents = [
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36'
      ]

      mobileUserAgents.forEach(userAgent => {
        expect(isMobileDevice(userAgent)).toBe(true)
      })
    })

    it('should correctly identify desktop devices', () => {
      const desktopUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ''
      ]

      desktopUserAgents.forEach(userAgent => {
        expect(isMobileDevice(userAgent)).toBe(false)
      })
    })

    it('should maintain backward compatibility with isIpadDevice', () => {
      expect(isIpadDevice('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe(true)
      expect(isIpadDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false)
    })
  })

  describe('Navigation Requirements Validation', () => {
    it('should meet requirement: mobile device restriction', () => {
      const mockRequest = createMockRequest('/', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.rewrite).toHaveBeenCalled()
    })

    it('should meet requirement: mobile navigation restriction', () => {
      const restrictedPaths = ['/consultations', '/financial', '/patients', '/backup']

      restrictedPaths.forEach(pathname => {
        jest.clearAllMocks()
        const mockRequest = createMockRequest(pathname, 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
        proxy(mockRequest)
        
        expect(mockNextResponse.rewrite).toHaveBeenCalled()
      })
    })

    it('should meet requirement: mobile users can access patient edit page via QR code', () => {
      const mockRequest = createMockRequest('/patients/some-uuid', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('should meet requirement: desktop access to all routes', () => {
      const mockRequest = createMockRequest('/patients/new', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })
  })
})
