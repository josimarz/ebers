/**
 * Security configuration and utilities for the Ebers application
 * Provides security best practices, CSP headers, and security validations
 */

/**
 * Content Security Policy configuration
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    'https://cdn.jsdelivr.net' // For external libraries if needed
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
    'https://fonts.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'img-src': [
    "'self'",
    'data:', // For base64 images
    'blob:', // For uploaded images
    'https:' // For external images (profile photos)
  ],
  'connect-src': [
    "'self'"
  ],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive
      }
      return `${directive} ${sources.join(' ')}`
    })
    .join('; ')
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy
  'Content-Security-Policy': generateCSPHeader(),
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', ')
}

/**
 * HTTPS Strict Transport Security (only for production)
 */
export const HSTS_HEADER = 'max-age=31536000; includeSubDomains; preload'

/**
 * Validate file upload security
 */
export function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.'
    }
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Arquivo muito grande. Tamanho máximo: 5MB.'
    }
  }

  // Check filename for dangerous patterns
  const filename = file.name
  if (filename.length > 255) {
    return {
      isValid: false,
      error: 'Nome do arquivo muito longo.'
    }
  }

  // Check for dangerous filename patterns
  const dangerousPatterns = [
    /[<>:"/\\|?*]/,  // Invalid filename characters
    /^\./,           // Hidden files
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$/i, // Executable files
    /(^|\/)\.\.($|\/)/  // Directory traversal
  ]

  if (dangerousPatterns.some(pattern => pattern.test(filename))) {
    return {
      isValid: false,
      error: 'Nome do arquivo contém caracteres ou extensão inválidos.'
    }
  }

  return { isValid: true }
}

/**
 * Validate and sanitize file path
 */
export function sanitizeFilePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return ''
  }

  return path
    .trim()
    // Remove directory traversal attempts
    .replace(/\.\./g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize path separators
    .replace(/[\\\/]+/g, '/')
    // Remove leading/trailing slashes
    .replace(/^\/+|\/+$/g, '')
    // Limit length
    .substring(0, 255)
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues if available (browser/Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Validate password strength (if authentication is added later)
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (!password) {
    return {
      isValid: false,
      score: 0,
      feedback: ['Senha é obrigatória']
    }
  }

  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Senha deve ter pelo menos 8 caracteres')
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Senha deve conter pelo menos uma letra maiúscula')
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Senha deve conter pelo menos uma letra minúscula')
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Senha deve conter pelo menos um número')
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1
  } else {
    feedback.push('Senha deve conter pelo menos um caractere especial')
  }

  // Common password check
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0
    feedback.push('Senha muito comum, escolha uma senha mais segura')
  }

  return {
    isValid: score >= 4,
    score,
    feedback
  }
}

/**
 * Sanitize database query parameters to prevent injection
 */
export function sanitizeDbQuery(query: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  Object.entries(query).forEach(([key, value]) => {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      return
    }

    // Sanitize string values
    if (typeof value === 'string') {
      // Remove SQL injection attempts
      const cleanValue = value
        .replace(/['"`;\\]/g, '') // Remove quotes, semicolons, backslashes
        .replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE|UNION|SELECT)\b/gi, '') // Remove SQL keywords
        .trim()

      if (cleanValue.length > 0) {
        sanitized[key] = cleanValue
      }
    } else if (typeof value === 'number' && !isNaN(value)) {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    } else if (value instanceof Date) {
      sanitized[key] = value
    }
  })

  return sanitized
}

/**
 * Environment-specific security configuration
 */
export const SECURITY_CONFIG = {
  development: {
    requireHttps: false,
    enableCSP: false, // Disabled for development ease
    logSecurityEvents: true,
    allowUnsafeEval: true
  },
  production: {
    requireHttps: true,
    enableCSP: true,
    logSecurityEvents: true,
    allowUnsafeEval: false
  }
}

/**
 * Get security configuration for current environment
 */
export function getSecurityConfig() {
  const env = process.env.NODE_ENV || 'development'
  return SECURITY_CONFIG[env as keyof typeof SECURITY_CONFIG] || SECURITY_CONFIG.development
}