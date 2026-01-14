/**
 * Data sanitization utilities for the Ebers application
 * Provides input sanitization, XSS protection, and data cleaning functions
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * HTML sanitization configuration for rich text content
 */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'span', 'div'
  ],
  ALLOWED_ATTR: [
    'style', 'class'
  ],
  ALLOWED_STYLES: {
    'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i],
    'font-size': [/^\d+px$/i, /^\d+em$/i, /^\d+rem$/i],
    'font-weight': [/^(normal|bold|bolder|lighter|\d{3})$/i],
    'text-decoration': [/^(none|underline|line-through)$/i],
    'font-style': [/^(normal|italic)$/i]
  }
}

/**
 * Sanitizes HTML content for rich text editors
 * Removes potentially dangerous HTML while preserving formatting
 */
export function sanitizeRichText(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Configure DOMPurify for rich text
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_CONFIG.ALLOWED_TAGS,
    ALLOWED_ATTR: RICH_TEXT_CONFIG.ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true
  })

  return cleanHtml.trim()
}

/**
 * Sanitizes inline CSS styles
 */
function sanitizeInlineStyles(style: string): string {
  if (!style) return ''

  const allowedStyles = RICH_TEXT_CONFIG.ALLOWED_STYLES
  const styleDeclarations = style.split(';')
  const sanitizedDeclarations: string[] = []

  for (const declaration of styleDeclarations) {
    const [property, value] = declaration.split(':').map(s => s.trim())
    
    if (property && value && allowedStyles[property as keyof typeof allowedStyles]) {
      const patterns = allowedStyles[property as keyof typeof allowedStyles]
      const isValid = patterns.some(pattern => pattern.test(value))
      
      if (isValid) {
        sanitizedDeclarations.push(`${property}: ${value}`)
      }
    }
  }

  return sanitizedDeclarations.join('; ')
}

/**
 * Sanitizes plain text input by removing/escaping dangerous characters
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .trim()
    // Remove HTML tags completely
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove script-related content more aggressively
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/alert\s*\(/gi, '')
    .replace(/eval\s*\(/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  return email
    .trim()
    .toLowerCase()
    // Remove dangerous characters
    .replace(/[<>'"&]/g, '')
}

/**
 * Sanitizes phone numbers
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  return phone
    .trim()
    // Keep only digits, spaces, parentheses, hyphens, and plus sign
    .replace(/[^\d\s()\-+]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
}

/**
 * Sanitizes CPF/RG numbers
 */
export function sanitizeDocument(document: string): string {
  if (!document || typeof document !== 'string') {
    return ''
  }

  return document
    .trim()
    // Keep only digits, dots, and hyphens
    .replace(/[^\d.\-]/g, '')
}

/**
 * Sanitizes names (removes special characters but keeps accents)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return ''
  }

  return name
    .trim()
    // Remove HTML tags completely
    .replace(/<[^>]*>/g, '')
    // Remove script content more aggressively - case insensitive
    .replace(/script/gi, '')
    .replace(/alert/gi, '')
    .replace(/javascript/gi, '')
    .replace(/xss/gi, '')
    // Remove dangerous characters but keep letters, spaces, apostrophes, and hyphens
    .replace(/[^a-zA-ZÀ-ÿ\s'\-]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Capitalize first letter of each word properly (including accented characters)
    .replace(/(^|\s)[a-zA-ZÀ-ÿ]/g, l => l.toUpperCase())
}

/**
 * Sanitizes URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmedUrl = url.trim()
  
  // Allow data URLs for images (base64 encoded)
  if (trimmedUrl.match(/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i)) {
    return trimmedUrl
  }
  
  // Only allow http and https protocols
  if (!trimmedUrl.match(/^https?:\/\//i)) {
    return ''
  }

  try {
    const urlObj = new URL(trimmedUrl)
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return ''
    }
    return urlObj.toString()
  } catch {
    return ''
  }
}

/**
 * Comprehensive data sanitization for patient data
 */
export function sanitizePatientData(data: any): any {
  if (!data || typeof data !== 'object') {
    return {}
  }

  const sanitized: any = {}

  // Sanitize text fields
  if (data.name) sanitized.name = sanitizeName(data.name)
  if (data.legalGuardian) sanitized.legalGuardian = sanitizeName(data.legalGuardian)
  if (data.email) sanitized.email = sanitizeEmail(data.email)
  if (data.legalGuardianEmail) sanitized.legalGuardianEmail = sanitizeEmail(data.legalGuardianEmail)
  if (data.phone1) sanitized.phone1 = sanitizePhone(data.phone1)
  if (data.phone2) sanitized.phone2 = sanitizePhone(data.phone2)
  if (data.cpf) sanitized.cpf = sanitizeDocument(data.cpf)
  if (data.rg) sanitized.rg = sanitizeDocument(data.rg)
  if (data.legalGuardianCpf) sanitized.legalGuardianCpf = sanitizeDocument(data.legalGuardianCpf)
  if (data.profilePhoto) sanitized.profilePhoto = sanitizeUrl(data.profilePhoto)

  // Sanitize long text fields
  if (data.therapyHistoryDetails) sanitized.therapyHistoryDetails = sanitizeText(data.therapyHistoryDetails)
  if (data.medicationSince) sanitized.medicationSince = sanitizeText(data.medicationSince)
  if (data.medicationNames) sanitized.medicationNames = sanitizeText(data.medicationNames)
  if (data.hospitalizationDate) sanitized.hospitalizationDate = sanitizeText(data.hospitalizationDate)
  if (data.hospitalizationReason) sanitized.hospitalizationReason = sanitizeText(data.hospitalizationReason)

  // Copy other fields as-is (enums, booleans, numbers, dates)
  const fieldsToKeep = [
    'birthDate', 'gender', 'religion', 'hasTherapyHistory', 'takesMedication', 
    'hasHospitalization', 'consultationPrice', 'consultationFrequency', 
    'consultationDay', 'credits'
  ]

  fieldsToKeep.forEach(field => {
    if (data[field] !== undefined) {
      sanitized[field] = data[field]
    }
  })

  return sanitized
}

/**
 * Comprehensive data sanitization for consultation data
 */
export function sanitizeConsultationData(data: any): any {
  if (!data || typeof data !== 'object') {
    return {}
  }

  const sanitized: any = {}

  // Sanitize rich text content
  if (data.content) sanitized.content = sanitizeRichText(data.content)
  if (data.notes) sanitized.notes = sanitizeRichText(data.notes)

  // Copy other fields as-is
  const fieldsToKeep = [
    'patientId', 'startedAt', 'finishedAt', 'paidAt', 'status', 'price', 'paid'
  ]

  fieldsToKeep.forEach(field => {
    if (data[field] !== undefined) {
      sanitized[field] = data[field]
    }
  })

  return sanitized
}

/**
 * Sanitizes search query parameters
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return ''
  }

  return query
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove SQL injection attempts - be more aggressive
    .replace(/['"`;\\]/g, '')
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|TABLE|FROM|WHERE|AND|OR)\b/gi, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Remove script-related content
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .substring(0, 100)
}

/**
 * Validates and sanitizes file uploads (for profile photos)
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

  // Check filename
  const filename = file.name
  if (filename.length > 255) {
    return {
      isValid: false,
      error: 'Nome do arquivo muito longo.'
    }
  }

  // Check for dangerous filename patterns
  if (/[<>:"/\\|?*]/.test(filename)) {
    return {
      isValid: false,
      error: 'Nome do arquivo contém caracteres inválidos.'
    }
  }

  return { isValid: true }
}

/**
 * Rate limiting helper for API endpoints
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }

  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

/**
 * Input validation for API parameters
 */
export function validateApiParameters(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return
    }

    switch (key) {
      case 'page':
      case 'limit':
        const num = parseInt(String(value))
        if (!isNaN(num) && num > 0) {
          sanitized[key] = num
        }
        break
      
      case 'search':
        sanitized[key] = sanitizeSearchQuery(String(value))
        break
      
      case 'sortBy':
      case 'sortOrder':
      case 'status':
        // Only allow alphanumeric characters and underscores
        const cleanValue = String(value).replace(/[^a-zA-Z0-9_]/g, '')
        if (cleanValue.length > 0 && cleanValue.length <= 50) {
          sanitized[key] = cleanValue
        }
        break
      
      default:
        // For other parameters, basic sanitization
        if (typeof value === 'string') {
          sanitized[key] = sanitizeText(value)
        } else {
          sanitized[key] = value
        }
    }
  })

  return sanitized
}