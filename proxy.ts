import { NextRequest, NextResponse } from 'next/server'

/**
 * Inline mobile detection to avoid import issues in Edge Runtime.
 */
function isMobile(userAgent: string): boolean {
  return /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Samsung|SM-T|SM-P|Kindle|Silk/i.test(userAgent)
}

/**
 * Middleware proxy that enforces mobile device access restrictions.
 *
 * Mobile devices (phones, iPads, tablets) can ONLY access:
 * - /patients/new (new patient registration)
 * - /patients/[id] (edit existing patient — via QR code)
 * - /api/patients/* (patient API routes needed by the forms)
 * - Static assets (_next/*, favicon)
 *
 * All other routes rewrite to /patients/new?device=mobile
 */
export function proxy(request: NextRequest): NextResponse {
  const userAgent = request.headers.get('user-agent') || ''
  const pathname = request.nextUrl.pathname
  const mobile = isMobile(userAgent)

  // Desktop users have unrestricted access
  if (!mobile) {
    const response = NextResponse.next()
    response.cookies.set('x-device-mobile', '0', { path: '/' })
    return response
  }

  // Normalize: remove trailing slash for consistent matching
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname

  // Mobile: set cookie so client components can detect mobile synchronously
  // Mobile: allow patient-related pages and API routes
  if (
    normalizedPath === '/patients/new' ||
    normalizedPath.startsWith('/api/patients') ||
    /^\/patients\/[^/]+$/.test(normalizedPath)
  ) {
    const response = NextResponse.next()
    response.cookies.set('x-device-mobile', '1', { path: '/' })
    return response
  }

  // Mobile: rewrite (not redirect) everything else to new patient form
  // Using rewrite avoids redirect loops in Safari
  const url = request.nextUrl.clone()
  url.pathname = '/patients/new'
  url.searchParams.set('device', 'mobile')
  const response = NextResponse.rewrite(url)
  response.cookies.set('x-device-mobile', '1', { path: '/' })
  return response
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico).*)',
  ],
}
