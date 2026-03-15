# Device Detection Middleware

## Overview

The middleware implements device detection and redirection logic for mobile devices (phones, iPads, tablets) as a security measure to restrict navigation.

## Functionality

### Mobile Device Detection
- Uses the `isMobileDevice` utility function to detect mobile devices via User-Agent header
- Detects: iPad, iPhone, Android phones/tablets, Samsung tablets, Kindle, and other mobile devices
- Handles missing or empty User-Agent headers gracefully

### Redirection Logic
When a mobile device is detected:

1. **Allowed Paths**: Mobile users can access:
   - `/patients/new` — Patient registration form
   - `/patients/[id]` — Patient edit page (via QR code)
   - `/api/patients/*` — Patient API routes
   - `/_next/*` — Next.js static assets
   - `/favicon.ico` — Favicon

2. **Restricted Paths**: All other paths redirect to `/patients/new?device=mobile`

### Desktop Behavior
- Desktop users have unrestricted access to all routes
- No redirection occurs for non-mobile devices

### QR Code Access Flow
The "Rede" button generates a QR code with the appropriate path:
- If the therapist is on a patient edit page (`/patients/[id]`), the QR code points to that page
- If the therapist is on any other page, the QR code points to `/patients/new`

## Implementation Details

### Middleware Configuration
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### Device Detection
```typescript
const userAgent = request.headers.get('user-agent') || ''
const isMobile = isMobileDevice(userAgent)
```

### UI Restrictions on Mobile
- Sidebar is hidden
- Header/breadcrumb is hidden
- Footer is hidden
- Only the patient form is visible
- Therapist-only fields (price, frequency, day) are hidden

## Testing

The middleware is tested with:
- Mobile device detection and redirection
- Allowed path access for mobile users
- Normal navigation for desktop users
- Edge cases (missing/empty User-Agent)
