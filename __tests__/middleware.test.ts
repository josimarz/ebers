/**
 * Middleware tests for device detection and redirection logic
 */

// Mock the device detection module
jest.mock('../lib/device-detection', () => ({
  isIpadDevice: jest.fn()
}))

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

import { isIpadDevice } from '../lib/device-detection'
import { NextResponse } from 'next/server'
import { proxy } from '../proxy'

const mockIsIpadDevice = isIpadDevice as jest.MockedFunction<typeof isIpadDevice>
const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('iPad Device Detection and Redirection', () => {
    it('should redirect iPad users to patient registration form', () => {
      mockIsIpadDevice.mockReturnValue(true)
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.redirect).toHaveBeenCalledWith(expect.any(URL))
      expect(mockIsIpadDevice).toHaveBeenCalledWith('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')
    })

    it('should allow iPad users to access patient registration form', () => {
      mockIsIpadDevice.mockReturnValue(true)
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
        nextUrl: { pathname: '/patients/new' },
        url: 'http://localhost:3000/patients/new'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow iPad users to access patient API routes', () => {
      mockIsIpadDevice.mockReturnValue(true)
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
        nextUrl: { pathname: '/api/patients' },
        url: 'http://localhost:3000/api/patients'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow normal navigation for desktop users', () => {
      mockIsIpadDevice.mockReturnValue(false)
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']]),
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow access to static files for iPad users', () => {
      mockIsIpadDevice.mockReturnValue(true)
      
      const mockRequest = {
        headers: new Map([['user-agent', 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)']]),
        nextUrl: { pathname: '/_next/static/css/app.css' },
        url: 'http://localhost:3000/_next/static/css/app.css'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing user-agent header', () => {
      mockIsIpadDevice.mockReturnValue(false)
      
      const mockRequest = {
        headers: new Map(),
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard'
      } as any

      mockRequest.headers.get = jest.fn(() => null)

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockIsIpadDevice).toHaveBeenCalledWith('')
    })

    it('should handle empty user-agent header', () => {
      mockIsIpadDevice.mockReturnValue(false)
      
      const mockRequest = {
        headers: new Map([['user-agent', '']]),
        nextUrl: { pathname: '/dashboard' },
        url: 'http://localhost:3000/dashboard'
      } as any

      mockRequest.headers.get = jest.fn((key: string) => 
        key === 'user-agent' ? '' : null
      )

      const response = proxy(mockRequest)
      
      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockIsIpadDevice).toHaveBeenCalledWith('')
    })
  })
})