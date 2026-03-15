/**
 * Middleware tests for device detection and redirection logic
 */

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
import { proxy } from '../proxy'

const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

function createMockRequest(pathname: string, userAgent: string) {
  const url = `http://localhost:3000${pathname}`
  const mockRequest = {
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
  return mockRequest
}

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Mobile Device Detection and Redirection', () => {
    it('should rewrite mobile users to patient registration form', () => {
      const mockRequest = createMockRequest('/dashboard', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.rewrite).toHaveBeenCalled()
      expect(mockNextResponse.next).not.toHaveBeenCalled()
    })

    it('should allow mobile users to access patient registration form', () => {
      const mockRequest = createMockRequest('/patients/new', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('should allow mobile users to access patient API routes', () => {
      const mockRequest = createMockRequest('/api/patients', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('should allow mobile users to access patient edit page', () => {
      const mockRequest = createMockRequest('/patients/abc123', 'Mozilla/5.0 (Linux; Android 13; SM-T870)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('should rewrite mobile users from consultations page', () => {
      const mockRequest = createMockRequest('/consultations', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
      proxy(mockRequest)
      
      expect(mockNextResponse.rewrite).toHaveBeenCalled()
    })

    it('should rewrite mobile users from financial page', () => {
      const mockRequest = createMockRequest('/financial', 'Mozilla/5.0 (Linux; Android 14; Pixel 8)')
      proxy(mockRequest)
      
      expect(mockNextResponse.rewrite).toHaveBeenCalled()
    })

    it('should allow normal navigation for desktop users', () => {
      const mockRequest = createMockRequest('/dashboard', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
    })

    it('should allow desktop users to access any page', () => {
      const paths = ['/consultations', '/financial', '/patients', '/backup']
      paths.forEach(pathname => {
        jest.clearAllMocks()
        const mockRequest = createMockRequest(pathname, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
        proxy(mockRequest)
        expect(mockNextResponse.next).toHaveBeenCalled()
        expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing user-agent header', () => {
      const mockRequest = createMockRequest('/dashboard', '')
      ;(mockRequest.headers.get as jest.Mock).mockReturnValue(null)
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
    })

    it('should handle empty user-agent header', () => {
      const mockRequest = createMockRequest('/dashboard', '')
      proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
    })
  })
})
