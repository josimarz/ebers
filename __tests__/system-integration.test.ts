/**
 * System Integration Tests
 * Tests the complete system integration including middleware, navigation, and device detection
 */

import { proxy } from '../proxy'
import { isIpadDevice } from '../lib/device-detection'

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ status: 200 })),
    redirect: jest.fn((url: URL) => ({ 
      status: 307, 
      headers: new Map([['location', url.toString()]]) 
    }))
  }
}))

import { NextResponse } from 'next/server'

const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

describe('System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Device Detection and Navigation Flow', () => {
    it('should properly detect iPad devices and redirect to registration', () => {
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
        nextUrl: { pathname: '/patients' },
        url: 'http://localhost:3000/patients'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.redirect).toHaveBeenCalledWith(expect.any(URL))
      
      // Verify the redirect URL contains the correct path and device parameter
      const redirectCall = mockNextResponse.redirect.mock.calls[0][0] as URL
      expect(redirectCall.pathname).toBe('/patients/new')
      expect(redirectCall.searchParams.get('device')).toBe('ipad')
    })

    it('should allow desktop users normal navigation', () => {
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']]),
        nextUrl: { pathname: '/patients' },
        url: 'http://localhost:3000/patients'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow iPad users to access patient registration and API routes', () => {
      const allowedPaths = [
        '/patients/new',
        '/api/patients',
        '/api/patients/123',
        '/_next/static/css/app.css',
        '/favicon.ico'
      ]

      allowedPaths.forEach(pathname => {
        jest.clearAllMocks()
        
        const mockRequest = {
          headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
          nextUrl: { pathname },
          url: `http://localhost:3000${pathname}`
        } as any

        mockRequest.headers.get = jest.fn((key: string) => 
          key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
        )

        const response = proxy(mockRequest)
        
        expect(mockNextResponse.next).toHaveBeenCalled()
        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      })
    })
  })

  describe('Device Detection Utility', () => {
    it('should correctly identify iPad devices', () => {
      const ipadUserAgents = [
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us)'
      ]

      ipadUserAgents.forEach(userAgent => {
        expect(isIpadDevice(userAgent)).toBe(true)
      })
    })

    it('should correctly identify non-iPad devices', () => {
      const nonIpadUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Android 10; Mobile; rv:81.0)',
        ''
      ]

      nonIpadUserAgents.forEach(userAgent => {
        expect(isIpadDevice(userAgent)).toBe(false)
      })
    })
  })

  describe('Navigation Requirements Validation', () => {
    it('should meet requirement 2.1: iPad device redirection', () => {
      // Requirement 2.1: WHEN the System is accessed from an iPad device, 
      // THE System SHALL redirect to the patient registration form
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
        nextUrl: { pathname: '/' },
        url: 'http://localhost:3000/'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.redirect).toHaveBeenCalled()
      const redirectCall = mockNextResponse.redirect.mock.calls[0][0] as URL
      expect(redirectCall.pathname).toBe('/patients/new')
    })

    it('should meet requirement 2.3: iPad navigation restriction', () => {
      // Requirement 2.3: WHILE accessing from iPad, THE System SHALL prevent 
      // navigation away from the registration form
      
      const restrictedPaths = [
        '/consultations',
        '/financial',
        '/patients',
        '/patients/123'
      ]

      restrictedPaths.forEach(pathname => {
        jest.clearAllMocks()
        
        const mockRequest = {
          headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
          nextUrl: { pathname },
          url: `http://localhost:3000${pathname}`
        } as any

        mockRequest.headers.get = jest.fn((key: string) => 
          key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
        )

        const response = proxy(mockRequest)
        
        expect(mockNextResponse.redirect).toHaveBeenCalled()
        const redirectCall = mockNextResponse.redirect.mock.calls[0][0] as URL
        expect(redirectCall.pathname).toBe('/patients/new')
      })
    })

    it('should meet requirement 2.4: Desktop access to all fields', () => {
      // Requirement 2.4: THE System SHALL allow therapist access to all fields 
      // when accessed from computer devices
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']]),
        nextUrl: { pathname: '/patients/new' },
        url: 'http://localhost:3000/patients/new'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })
  })
})