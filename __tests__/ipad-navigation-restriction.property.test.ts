/**
 * Property-based tests for mobile device navigation restriction
 * Feature: patient-management-system, Property 4: Mobile Navigation Restriction
 * Validates: Requirements 2.3
 */

import * as fc from 'fast-check'
import { NextResponse } from 'next/server'
import { proxy } from '../proxy'

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

describe('Property 4: Mobile Navigation Restriction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prevent mobile users from navigating to restricted paths', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36',
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
          'Custom Browser iPad Version 1.0'
        ),
        fc.constantFrom(
          '/dashboard',
          '/patients',
          '/consultations',
          '/financial',
          '/settings',
          '/profile',
          '/admin',
          '/consultations/456',
          '/consultations/new',
          '/api/consultations',
          '/api/financial',
          '/api/reports'
        ),
        (mobileUserAgent, restrictedPath) => {
          jest.clearAllMocks()
          const request = createMockRequest(restrictedPath, mobileUserAgent)
          proxy(request)
          
          expect(mockNextResponse.rewrite).toHaveBeenCalled()
          expect(mockNextResponse.next).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should allow mobile users to access only allowed paths without restriction', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36'
        ),
        fc.constantFrom(
          '/patients/new',
          '/patients/abc123',
          '/patients/some-uuid-here',
          '/api/patients',
          '/api/patients/create',
          '/api/patients/123'
        ),
        (mobileUserAgent, allowedPath) => {
          jest.clearAllMocks()
          const request = createMockRequest(allowedPath, mobileUserAgent)
          proxy(request)
          
          expect(mockNextResponse.next).toHaveBeenCalled()
          expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should allow unrestricted navigation for desktop devices', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          '',
          'Custom Browser 1.0'
        ),
        fc.constantFrom(
          '/dashboard',
          '/patients',
          '/patients/new',
          '/consultations',
          '/financial',
          '/settings',
          '/api/patients',
          '/api/consultations'
        ),
        (desktopUserAgent, anyPath) => {
          jest.clearAllMocks()
          const request = createMockRequest(anyPath, desktopUserAgent)
          proxy(request)
          
          expect(mockNextResponse.next).toHaveBeenCalled()
          expect(mockNextResponse.rewrite).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should consistently prevent navigation across multiple attempts', () => {
    fc.assert(
      fc.property(
        fc.constant(
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        ),
        fc.array(
          fc.constantFrom(
            '/dashboard',
            '/consultations',
            '/financial',
            '/settings'
          ),
          { minLength: 2, maxLength: 5 }
        ),
        (mobileUserAgent, navigationSequence) => {
          navigationSequence.forEach((path) => {
            jest.clearAllMocks()
            const request = createMockRequest(path, mobileUserAgent)
            proxy(request)
            
            expect(mockNextResponse.rewrite).toHaveBeenCalled()
            expect(mockNextResponse.next).not.toHaveBeenCalled()
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
