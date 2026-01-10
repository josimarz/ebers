/**
 * Property-based tests for iPad navigation restriction
 * Feature: patient-management-system, Property 4: iPad Navigation Restriction
 * Validates: Requirements 2.3
 */

import * as fc from 'fast-check'
import { NextRequest, NextResponse } from 'next/server'
import { proxy } from '../proxy'
import { isIpadDevice } from '../lib/device-detection'

// Mock the device detection module
jest.mock('../lib/device-detection', () => ({
  isIpadDevice: jest.fn()
}))

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ status: 200, type: 'next' })),
    redirect: jest.fn((url: URL) => ({ 
      status: 307, 
      type: 'redirect',
      headers: new Map([['location', url.toString()]]),
      url: url.toString()
    }))
  }
}))

const mockIsIpadDevice = isIpadDevice as jest.MockedFunction<typeof isIpadDevice>
const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

// Helper function to create mock NextRequest
function createMockRequest(pathname: string, userAgent: string): NextRequest {
  const mockRequest = {
    headers: new Map([['user-agent', userAgent]]),
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`
  } as any

  mockRequest.headers.get = jest.fn((key: string) => 
    key === 'user-agent' ? userAgent : null
  )

  return mockRequest
}

describe('Property 4: iPad Navigation Restriction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property: For any navigation attempt on iPad devices, the system should 
   * prevent navigation away from the registration form
   * 
   * Feature: patient-management-system, Property 4: iPad Navigation Restriction
   * Validates: Requirements 2.3
   */
  it('should prevent iPad users from navigating away from registration form', () => {
    fc.assert(
      fc.property(
        // Generator for iPad user agents
        fc.constantFrom(
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X)',
          'Custom Browser iPad Version 1.0',
          'Safari on iPad Device'
        ),
        // Generator for restricted paths (paths iPad users should not access)
        fc.constantFrom(
          '/dashboard',
          '/patients',
          '/consultations',
          '/financial',
          '/settings',
          '/profile',
          '/admin',
          '/reports',
          '/analytics',
          '/help',
          '/about',
          '/contact',
          '/patients/123',
          '/consultations/456',
          '/patients/123/edit',
          '/consultations/new',
          '/api/consultations',
          '/api/financial',
          '/api/reports'
        ),
        (ipadUserAgent, restrictedPath) => {
          // Setup: Mock iPad detection
          mockIsIpadDevice.mockReturnValue(true)
          
          // Create request for restricted path
          const request = createMockRequest(restrictedPath, ipadUserAgent)
          
          // Execute proxy
          const response = proxy(request)
          
          // Verify iPad was detected
          expect(mockIsIpadDevice).toHaveBeenCalledWith(ipadUserAgent)
          
          // Verify redirection occurred (navigation was prevented)
          expect(mockNextResponse.redirect).toHaveBeenCalled()
          expect(mockNextResponse.next).not.toHaveBeenCalled()
          
          // Verify redirection target is patient registration form
          const redirectCall = mockNextResponse.redirect.mock.calls[0]
          expect(redirectCall).toBeDefined()
          const redirectUrl = redirectCall[0] as URL
          expect(redirectUrl.pathname).toBe('/patients/new')
          expect(redirectUrl.searchParams.get('device')).toBe('ipad')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any allowed path on iPad devices, the system should allow 
   * navigation without redirection
   * 
   * Feature: patient-management-system, Property 4: iPad Navigation Restriction
   * Validates: Requirements 2.3
   */
  it('should allow iPad users to access only allowed paths without redirection', () => {
    fc.assert(
      fc.property(
        // Generator for iPad user agents
        fc.constantFrom(
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        ),
        // Generator for allowed paths (paths iPad users can access)
        fc.constantFrom(
          '/patients/new',
          '/api/patients',
          '/api/patients/create',
          '/api/patients/123',
          '/_next/static/css/app.css',
          '/_next/static/js/main.js',
          '/_next/image/logo.png',
          '/favicon.ico'
        ),
        (ipadUserAgent, allowedPath) => {
          // Setup: Mock iPad detection
          mockIsIpadDevice.mockReturnValue(true)
          
          // Create request for allowed path
          const request = createMockRequest(allowedPath, ipadUserAgent)
          
          // Execute proxy
          const response = proxy(request)
          
          // Verify iPad was detected
          expect(mockIsIpadDevice).toHaveBeenCalledWith(ipadUserAgent)
          
          // Verify no redirection occurred (navigation was allowed)
          expect(mockNextResponse.next).toHaveBeenCalled()
          expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any navigation attempt on non-iPad devices, the system should 
   * allow unrestricted navigation
   * 
   * Feature: patient-management-system, Property 4: iPad Navigation Restriction
   * Validates: Requirements 2.3
   */
  it('should allow unrestricted navigation for non-iPad devices', () => {
    fc.assert(
      fc.property(
        // Generator for non-iPad user agents
        fc.constantFrom(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
          '',
          'Custom Browser 1.0'
        ),
        // Generator for any path (all paths should be accessible for desktop)
        fc.constantFrom(
          '/dashboard',
          '/patients',
          '/patients/new',
          '/consultations',
          '/financial',
          '/settings',
          '/api/patients',
          '/api/consultations',
          '/patients/123/edit',
          '/_next/static/css/app.css'
        ),
        (nonIpadUserAgent, anyPath) => {
          // Setup: Mock non-iPad detection
          mockIsIpadDevice.mockReturnValue(false)
          
          // Create request for any path
          const request = createMockRequest(anyPath, nonIpadUserAgent)
          
          // Execute proxy
          const response = proxy(request)
          
          // Verify device detection was called
          expect(mockIsIpadDevice).toHaveBeenCalledWith(nonIpadUserAgent)
          
          // Verify no redirection occurred (unrestricted navigation)
          expect(mockNextResponse.next).toHaveBeenCalled()
          expect(mockNextResponse.redirect).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any iPad navigation attempt, the redirection should always 
   * point to the patient registration form with device parameter
   * 
   * Feature: patient-management-system, Property 4: iPad Navigation Restriction
   * Validates: Requirements 2.3
   */
  it('should consistently redirect iPad users to registration form with device parameter', () => {
    fc.assert(
      fc.property(
        // Generator for iPad user agents
        fc.constantFrom(
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          'Mozilla/5.0 (iPad; CPU OS 15_5 like Mac OS X)',
          'Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X)'
        ),
        // Generator for various restricted paths and base URLs
        fc.record({
          restrictedPath: fc.constantFrom(
            '/dashboard',
            '/patients',
            '/consultations',
            '/financial',
            '/patients/123/edit'
          ),
          baseUrl: fc.constantFrom(
            'http://localhost:3000',
            'https://localhost:3000',
            'http://192.168.1.100:3000',
            'https://ebers.local:3000'
          )
        }),
        (ipadUserAgent, { restrictedPath, baseUrl }) => {
          // Setup: Mock iPad detection
          mockIsIpadDevice.mockReturnValue(true)
          
          // Create request with custom base URL
          const mockRequest = {
            headers: new Map([['user-agent', ipadUserAgent]]),
            nextUrl: { pathname: restrictedPath },
            url: `${baseUrl}${restrictedPath}`
          } as any

          mockRequest.headers.get = jest.fn((key: string) => 
            key === 'user-agent' ? ipadUserAgent : null
          )
          
          // Execute proxy
          const response = proxy(mockRequest)
          
          // Verify redirection occurred
          expect(mockNextResponse.redirect).toHaveBeenCalled()
          
          // Verify redirection details
          const redirectCall = mockNextResponse.redirect.mock.calls[0]
          const redirectUrl = redirectCall[0] as URL
          
          // Should always redirect to patient registration
          expect(redirectUrl.pathname).toBe('/patients/new')
          
          // Should always include device parameter
          expect(redirectUrl.searchParams.get('device')).toBe('ipad')
          
          // Should use the same base URL (host and protocol may vary in test environment)
          expect(redirectUrl.href).toContain('/patients/new?device=ipad')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any sequence of navigation attempts from iPad, the system 
   * should consistently prevent navigation away from registration form
   * 
   * Feature: patient-management-system, Property 4: iPad Navigation Restriction
   * Validates: Requirements 2.3
   */
  it('should consistently prevent navigation across multiple attempts', () => {
    fc.assert(
      fc.property(
        // Generator for iPad user agent
        fc.constantFrom(
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        ),
        // Generator for sequence of navigation attempts
        fc.array(
          fc.constantFrom(
            '/dashboard',
            '/patients',
            '/consultations',
            '/financial',
            '/settings',
            '/patients/123',
            '/consultations/456'
          ),
          { minLength: 2, maxLength: 5 }
        ),
        (ipadUserAgent, navigationSequence) => {
          // Setup: Mock iPad detection for all attempts
          mockIsIpadDevice.mockReturnValue(true)
          
          // Test each navigation attempt in sequence
          navigationSequence.forEach((path, index) => {
            // Clear previous calls
            jest.clearAllMocks()
            mockIsIpadDevice.mockReturnValue(true)
            
            // Create request for this navigation attempt
            const request = createMockRequest(path, ipadUserAgent)
            
            // Execute proxy
            const response = proxy(request)
            
            // Verify this attempt was blocked
            expect(mockNextResponse.redirect).toHaveBeenCalled()
            expect(mockNextResponse.next).not.toHaveBeenCalled()
            
            // Verify consistent redirection target
            const redirectCall = mockNextResponse.redirect.mock.calls[0]
            const redirectUrl = redirectCall[0] as URL
            expect(redirectUrl.pathname).toBe('/patients/new')
            expect(redirectUrl.searchParams.get('device')).toBe('ipad')
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any edge case user agent containing 'iPad', the system should 
   * apply navigation restrictions
   * 
   * Feature: patient-management-system, Property 4: iPad Navigation Restriction
   * Validates: Requirements 2.3
   */
  it('should apply navigation restrictions to any user agent containing iPad', () => {
    fc.assert(
      fc.property(
        // Generator for various user agents containing 'iPad'
        fc.oneof(
          fc.constant('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'),
          fc.constant('Custom iPad Browser 1.0'),
          fc.constant('iPad Application WebView'),
          fc.constant('Some Browser on iPad Device'),
          fc.constant('iPad'),
          fc.constant('Testing iPad User Agent'),
          fc.constant('Mozilla iPad Safari')
        ),
        // Generator for restricted path
        fc.constantFrom('/dashboard', '/patients', '/consultations'),
        (ipadUserAgent, restrictedPath) => {
          // Setup: Mock iPad detection (should return true for any string containing 'iPad')
          mockIsIpadDevice.mockReturnValue(true)
          
          // Create request
          const request = createMockRequest(restrictedPath, ipadUserAgent)
          
          // Execute proxy
          const response = proxy(request)
          
          // Verify iPad detection was called
          expect(mockIsIpadDevice).toHaveBeenCalledWith(ipadUserAgent)
          
          // Verify navigation was restricted
          expect(mockNextResponse.redirect).toHaveBeenCalled()
          expect(mockNextResponse.next).not.toHaveBeenCalled()
          
          // Verify redirection target
          const redirectCall = mockNextResponse.redirect.mock.calls[0]
          const redirectUrl = redirectCall[0] as URL
          expect(redirectUrl.pathname).toBe('/patients/new')
        }
      ),
      { numRuns: 100 }
    )
  })
})