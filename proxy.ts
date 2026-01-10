import { NextRequest, NextResponse } from 'next/server'
import { isIpadDevice } from '@/lib/device-detection'

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  const isIpad = isIpadDevice(userAgent)
  const pathname = request.nextUrl.pathname
  
  // If accessing from iPad
  if (isIpad) {
    // Allow access to patient registration form and its API routes
    if (
      pathname === '/patients/new' ||
      pathname.startsWith('/api/patients') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname === '/favicon.ico'
    ) {
      return NextResponse.next()
    }
    
    // Redirect all other paths to patient registration form
    const url = new URL('/patients/new', request.url)
    url.searchParams.set('device', 'ipad')
    return NextResponse.redirect(url)
  }
  
  // For non-iPad devices, allow normal navigation
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}