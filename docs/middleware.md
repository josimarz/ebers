# Device Detection Middleware

## Overview

The middleware implements device detection and redirection logic for iPad users as specified in requirements 2.1 and 2.3.

## Functionality

### iPad Detection
- Uses the `isIpadDevice` utility function to detect iPad devices via User-Agent header
- Handles missing or empty User-Agent headers gracefully

### Redirection Logic
When an iPad device is detected:

1. **Allowed Paths**: iPad users can access:
   - `/patients/new` - Patient registration form
   - `/api/patients/*` - Patient API routes
   - `/_next/*` - Next.js static assets
   - `/favicon.ico` - Favicon

2. **Restricted Paths**: All other paths redirect to `/patients/new?device=ipad`

### Desktop Behavior
- Desktop users have unrestricted access to all routes
- No redirection occurs for non-iPad devices

## Implementation Details

### Middleware Configuration
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

This matcher ensures the middleware runs on all routes except static assets.

### Device Detection
```typescript
const userAgent = request.headers.get('user-agent') || ''
const isIpad = isIpadDevice(userAgent)
```

Uses the existing `isIpadDevice` utility for consistent device detection.

### Redirection
```typescript
const url = new URL('/patients/new', request.url)
url.searchParams.set('device', 'ipad')
return NextResponse.redirect(url)
```

Redirects to patient registration with device parameter for UI customization.

## Requirements Compliance

- ✅ **Requirement 2.1**: iPad users are redirected to patient registration form
- ✅ **Requirement 2.3**: iPad users cannot navigate away from registration form
- ✅ Maintains access to necessary API routes and static assets
- ✅ Preserves normal navigation for desktop users

## Testing

The middleware is tested with:
- iPad device detection and redirection
- Allowed path access for iPad users
- Normal navigation for desktop users
- Edge cases (missing/empty User-Agent)

All tests pass and verify the middleware behavior matches requirements.