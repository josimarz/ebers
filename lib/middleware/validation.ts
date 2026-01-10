/**
 * Validation middleware for API routes
 * Provides request validation, sanitization, and security checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizePatientData, sanitizeConsultationData, validateApiParameters, RateLimiter } from '@/lib/sanitization'
import { ValidationError, handleApiError, ErrorLogger } from '@/lib/error-handling'

// Rate limiter instances
const generalRateLimiter = new RateLimiter(100, 60000) // 100 requests per minute
const strictRateLimiter = new RateLimiter(20, 60000)   // 20 requests per minute for sensitive operations

/**
 * Middleware wrapper for API route validation
 */
export function withValidation<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    rateLimit?: 'general' | 'strict' | 'none'
    validateBody?: z.ZodSchema
    sanitizeBody?: 'patient' | 'consultation' | 'none'
    requireAuth?: boolean
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Rate limiting
      if (options.rateLimit && options.rateLimit !== 'none') {
        const clientIp = getClientIp(request)
        const rateLimiter = options.rateLimit === 'strict' ? strictRateLimiter : generalRateLimiter
        
        if (!rateLimiter.isAllowed(clientIp)) {
          return NextResponse.json(
            { error: 'Muitas solicitações. Tente novamente em alguns minutos.' },
            { status: 429 }
          )
        }
      }

      // Security headers validation
      validateSecurityHeaders(request)

      // Body validation and sanitization
      if (request.method !== 'GET' && (options.validateBody || options.sanitizeBody !== 'none')) {
        const body = await request.json().catch(() => ({}))
        
        // Sanitize body data
        let sanitizedBody = body
        if (options.sanitizeBody === 'patient') {
          sanitizedBody = sanitizePatientData(body)
        } else if (options.sanitizeBody === 'consultation') {
          sanitizedBody = sanitizeConsultationData(body)
        }

        // Validate body schema
        if (options.validateBody) {
          const validation = options.validateBody.safeParse(sanitizedBody)
          if (!validation.success) {
            throw new ValidationError('Dados inválidos', {
              validationErrors: formatZodErrors(validation.error)
            })
          }
          
          // Replace request body with validated data
          Object.defineProperty(request, 'validatedBody', {
            value: validation.data,
            writable: false
          })
        } else {
          // Replace request body with sanitized data
          Object.defineProperty(request, 'sanitizedBody', {
            value: sanitizedBody,
            writable: false
          })
        }
      }

      // Query parameters validation
      const url = new URL(request.url)
      const sanitizedParams = validateApiParameters(Object.fromEntries(url.searchParams))
      Object.defineProperty(request, 'sanitizedParams', {
        value: sanitizedParams,
        writable: false
      })

      // Call the actual handler
      return await handler(request, ...args)
    } catch (error) {
      const errorInfo = handleApiError(error)
      ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
        endpoint: `${request.method} ${request.nextUrl.pathname}`,
        userAgent: request.headers.get('user-agent'),
        ip: getClientIp(request)
      })
      
      return NextResponse.json(
        { error: errorInfo.message, details: errorInfo.details },
        { status: errorInfo.statusCode }
      )
    }
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

/**
 * Validate security headers
 */
function validateSecurityHeaders(request: NextRequest): void {
  const contentType = request.headers.get('content-type')
  
  // For POST/PUT requests, ensure proper content type
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!contentType || !contentType.includes('application/json')) {
      throw new ValidationError('Content-Type deve ser application/json')
    }
  }

  // Check for suspicious user agents
  const userAgent = request.headers.get('user-agent') || ''
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ]
  
  // Allow legitimate bots but log suspicious activity
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    ErrorLogger.log(new Error('Suspicious user agent detected'), {
      userAgent,
      ip: getClientIp(request),
      endpoint: request.nextUrl.pathname
    })
  }
}

/**
 * Format Zod validation errors
 */
function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  
  error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    errors[path] = issue.message
  })
  
  return errors
}

/**
 * CORS middleware for API routes
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    origin?: string | string[]
    methods?: string[]
    allowedHeaders?: string[]
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: getCorsHeaders(request, options)
      })
    }

    // Handle actual request
    const response = await handler(request)
    
    // Add CORS headers to response
    const corsHeaders = getCorsHeaders(request, options)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Get CORS headers
 */
function getCorsHeaders(
  request: NextRequest,
  options: {
    origin?: string | string[]
    methods?: string[]
    allowedHeaders?: string[]
  }
): Record<string, string> {
  const origin = request.headers.get('origin')
  const allowedOrigins = options.origin || ['http://localhost:3000']
  const allowedMethods = options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  const allowedHeaders = options.allowedHeaders || ['Content-Type', 'Authorization']

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': '86400'
  }

  // Check if origin is allowed
  if (origin && (
    Array.isArray(allowedOrigins) 
      ? allowedOrigins.includes(origin)
      : allowedOrigins === origin
  )) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

/**
 * Security middleware for sensitive operations
 */
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    requireHttps?: boolean
    maxBodySize?: number
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Require HTTPS in production
    if (options.requireHttps && process.env.NODE_ENV === 'production') {
      if (request.nextUrl.protocol !== 'https:') {
        throw new ValidationError('HTTPS é obrigatório')
      }
    }

    // Check body size
    if (options.maxBodySize && request.body) {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > options.maxBodySize) {
        throw new ValidationError('Corpo da requisição muito grande')
      }
    }

    // Add security headers to response
    const response = await handler(request)
    
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    return response
  }
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware<T extends any[]>(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: (request: NextRequest, ...args: T) => Promise<NextResponse>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// Extend NextRequest type to include validated/sanitized data
declare global {
  namespace NodeJS {
    interface NextRequest {
      validatedBody?: any
      sanitizedBody?: any
      sanitizedParams?: Record<string, any>
    }
  }
}