/**
 * Integration tests for error handling across the application
 * Tests error scenarios, recovery mechanisms, and user experience
 */

// Mock NextRequest to avoid Web API issues in Node.js
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    body: init?.body,
    json: async () => JSON.parse(init?.body || '{}'),
    nextUrl: {
      searchParams: new URLSearchParams(url.split('?')[1] || '')
    }
  })),
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {}))
    })
  }
}))

import { NextRequest } from 'next/server'
import { GET as getPatientsHandler, POST as createPatientHandler } from '@/app/api/patients/route'
import { POST as createConsultationHandler } from '@/app/api/consultations/route'
import { handleApiError, ValidationError, NotFoundError, BusinessRuleError, ErrorLogger } from '@/lib/error-handling'
import { sanitizePatientData, sanitizeConsultationData, RateLimiter } from '@/lib/sanitization'
import { PrismaClient } from '@prisma/client'

// Mock Prisma before importing modules that use it
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    consultation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  },
}))

// Get the mocked prisma instance
const { prisma: mockPrisma } = require('@/lib/prisma')

// Mock console methods for testing logging
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

// Helper function to create mock NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Error Handling Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('API Error Handling', () => {
    it('should handle validation errors with detailed messages', async () => {
      const invalidPatientData = {
        name: '', // Empty name
        birthDate: 'invalid-date',
        gender: 'INVALID_GENDER',
        religion: 'INVALID_RELIGION',
        phone1: '',
        hasTherapyHistory: 'not-boolean',
        takesMedication: 'not-boolean',
        hasHospitalization: 'not-boolean',
        consultationPrice: -100, // Negative price
        credits: -5, // Negative credits
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/patients', invalidPatientData)
      const response = await createPatientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.')
      expect(data.details).toBeDefined()
      expect(typeof data.details).toBe('object')

      // Should have multiple validation errors
      const detailsKeys = Object.keys(data.details.validationErrors || {})
      expect(detailsKeys.length).toBeGreaterThan(5)
      expect(detailsKeys).toContain('name')
      expect(detailsKeys).toContain('birthDate')
      expect(detailsKeys).toContain('gender')
    })

    it('should handle database connection errors gracefully', async () => {
      // Set NODE_ENV to development for this test
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      // Mock database connection failure
      mockPrisma.patient.findMany.mockRejectedValue(new Error('Connection refused'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/patients')
      const response = await getPatientsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
      expect(typeof data.error).toBe('string')

      // Should log the error
      expect(mockConsoleError).toHaveBeenCalled()

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv
    })

    it('should handle Prisma constraint violations', async () => {
      // Mock unique constraint violation
      const prismaError = new Error('Unique constraint failed')
      Object.assign(prismaError, { code: 'P2002' })

      mockPrisma.patient.create.mockRejectedValue(prismaError)

      const patientData = {
        name: 'João Silva',
        birthDate: '1990-05-15',
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '(11) 99999-9999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/patients', patientData)
      const response = await createPatientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('Já existe um registro')
    })

    it('should handle foreign key constraint violations', async () => {
      // Mock patient exists but has invalid consultation price
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        consultationPrice: null, // This will cause the consultation creation to fail
        credits: 0
      })
      mockPrisma.consultation.findFirst.mockResolvedValue(null)

      const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
        patientId: 'patient-1',
      })
      const response = await createConsultationHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('deve ser definido')
    })

    it('should handle record not found errors', async () => {
      // Mock patient not found
      mockPrisma.patient.findUnique.mockResolvedValue(null)

      const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
        patientId: 'non-existent-patient',
      })
      const response = await createConsultationHandler(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('não encontrado')
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{ invalid json }',
      })

      const response = await createPatientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle missing content-type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/patients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await createPatientHandler(request)
      const data = await response.json()

      // Missing content-type should result in validation error (400) not server error (500)
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('Business Logic Error Handling', () => {
    it('should handle consultation creation with missing consultation price', async () => {
      const patient = {
        id: 'patient-1',
        name: 'João Silva',
        consultationPrice: null, // No price set
        credits: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.patient.findUnique.mockResolvedValue(patient)

      const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
        patientId: 'patient-1',
      })
      const response = await createConsultationHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('deve ser definido')
    })

    it('should handle credit sales for patient without consultation price', async () => {
      // This would be tested in credit sales API when implemented
      const patient = {
        id: 'patient-1',
        name: 'João Silva',
        consultationPrice: null,
        credits: 0,
      }

      // Simulate business rule validation
      const canSellCredits = patient.consultationPrice != null && patient.consultationPrice > 0
      expect(canSellCredits).toBe(false)
    })

    it('should handle concurrent consultation creation attempts', async () => {
      const patient = {
        id: 'patient-1',
        name: 'João Silva',
        consultationPrice: 150.00,
        credits: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // First request finds no existing consultations
      mockPrisma.patient.findUnique.mockResolvedValueOnce(patient)
      mockPrisma.consultation.findFirst.mockResolvedValueOnce(null)

      const consultation = {
        id: 'consultation-1',
        patientId: 'patient-1',
        status: 'OPEN',
        createdAt: new Date(),
        patient: {
          id: 'patient-1',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-05-15')
        }
      }

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        const tx = {
          consultation: {
            create: jest.fn().mockResolvedValue(consultation)
          },
          patient: {
            update: jest.fn().mockResolvedValue({ ...patient, credits: 0 })
          }
        }
        return callback(tx)
      })

      // Second request finds existing consultation
      mockPrisma.patient.findUnique.mockResolvedValueOnce(patient)
      mockPrisma.consultation.findFirst.mockResolvedValueOnce({
        id: 'consultation-1',
        patientId: 'patient-1',
        status: 'OPEN'
      })

      // First request should succeed
      const request1 = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
        patientId: 'patient-1',
      })
      const response1 = await createConsultationHandler(request1)
      expect(response1.status).toBe(201)

      // Second request should fail
      const request2 = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
        patientId: 'patient-1',
      })
      const response2 = await createConsultationHandler(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(data2.error).toContain('não finalizada')
    })
  })

  describe('Data Sanitization Error Handling', () => {
    it('should handle XSS attempts in patient data', async () => {
      const maliciousPatientData = {
        name: '<script>alert("xss")</script>João Silva',
        birthDate: '1990-05-15',
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '(11) 99999-9999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        therapyHistoryDetails: '<img src="x" onerror="alert(1)">',
        email: 'test@example.com<script>alert("xss")</script>',
      }

      // Sanitize the data
      const sanitizedData = sanitizePatientData(maliciousPatientData)

      expect(sanitizedData.name).not.toContain('<script>')
      expect(sanitizedData.therapyHistoryDetails).not.toContain('<img')
      expect(sanitizedData.email).not.toContain('<script>')
      expect(sanitizedData.name).toBe('João Silva') // Should preserve clean content
    })

    it('should handle SQL injection attempts in search parameters', async () => {
      const maliciousSearch = "'; DROP TABLE patients; --"

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/patients?search=${encodeURIComponent(maliciousSearch)}`
      )

      // Mock successful response (sanitization should prevent injection)
      mockPrisma.patient.findMany.mockResolvedValue([])
      mockPrisma.patient.count.mockResolvedValue(0)

      const response = await getPatientsHandler(request)
      expect(response.status).toBe(200)

      // Verify that Prisma was called with sanitized search term
      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: expect.not.stringContaining('DROP'),
          },
        },
        include: {
          _count: {
            select: {
              consultations: {
                where: {
                  status: 'OPEN',
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      })
    })

    it('should handle malicious rich text content in consultations', async () => {
      const maliciousConsultationData = {
        patientId: 'patient-1',
        content: '<script>alert("xss")</script><p>Legitimate content</p><iframe src="evil.com"></iframe>',
        notes: '<img src="x" onerror="alert(1)"><strong>Important note</strong>',
      }

      const sanitizedData = sanitizeConsultationData(maliciousConsultationData)

      expect(sanitizedData.content).not.toContain('<script>')
      expect(sanitizedData.content).not.toContain('<iframe>')
      expect(sanitizedData.content).toContain('<p>Legitimate content</p>')
      expect(sanitizedData.notes).not.toContain('<img')
      expect(sanitizedData.notes).toContain('<strong>Important note</strong>')
    })
  })

  describe('Rate Limiting Error Handling', () => {
    it('should handle rate limiting correctly', () => {
      const rateLimiter = new RateLimiter(2, 1000) // 2 requests per second

      // First two requests should be allowed
      expect(rateLimiter.isAllowed('client-1')).toBe(true)
      expect(rateLimiter.isAllowed('client-1')).toBe(true)

      // Third request should be blocked
      expect(rateLimiter.isAllowed('client-1')).toBe(false)

      // Different client should be allowed
      expect(rateLimiter.isAllowed('client-2')).toBe(true)
    })

    it('should reset rate limiting after time window', async () => {
      const rateLimiter = new RateLimiter(1, 100) // 1 request per 100ms

      // First request allowed
      expect(rateLimiter.isAllowed('client-1')).toBe(true)

      // Second request blocked
      expect(rateLimiter.isAllowed('client-1')).toBe(false)

      // Wait for time window to pass
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      expect(rateLimiter.isAllowed('client-1')).toBe(true)
    })
  })

  describe('Error Recovery and Logging', () => {
    it('should log errors with proper context', () => {
      // Set NODE_ENV to development for this test
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const testError = new Error('Test error')
      const context = {
        userId: 'user-123',
        action: 'create-patient',
        timestamp: new Date().toISOString(),
      }

      const loggedError = ErrorLogger.log(testError, context)

      expect(loggedError).toEqual(
        expect.objectContaining({
          name: 'Error',
          message: 'Test error',
          context,
          timestamp: expect.any(String),
        })
      )

      expect(mockConsoleError).toHaveBeenCalledWith('Error logged:', loggedError)

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv
    })

    it('should handle custom error types correctly', () => {
      const validationError = new ValidationError('Invalid data', { field: 'name' })
      const notFoundError = new NotFoundError('Patient')
      const businessError = new BusinessRuleError('Cannot create consultation')

      // Test ValidationError
      const validationResult = handleApiError(validationError)
      expect(validationResult.statusCode).toBe(400)
      expect(validationResult.message).toBe('Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.')
      expect(validationResult.details).toEqual({ field: 'name' })

      // Test NotFoundError
      const notFoundResult = handleApiError(notFoundError)
      expect(notFoundResult.statusCode).toBe(404)
      expect(notFoundResult.message).toBe('Patient não foi encontrado.')

      // Test BusinessRuleError
      const businessResult = handleApiError(businessError)
      expect(businessResult.statusCode).toBe(400)
      expect(businessResult.message).toBe('Cannot create consultation')
    })

    it('should handle unknown errors gracefully', () => {
      const unknownError = { weird: 'object' }
      const result = handleApiError(unknownError)

      expect(result.statusCode).toBe(500)
      expect(result.message).toBe('Erro interno do servidor')
    })

    it('should handle null and undefined errors', () => {
      const nullResult = handleApiError(null)
      expect(nullResult.statusCode).toBe(500)
      expect(nullResult.message).toBe('Erro interno do servidor')

      const undefinedResult = handleApiError(undefined)
      expect(undefinedResult.statusCode).toBe(500)
      expect(undefinedResult.message).toBe('Erro interno do servidor')
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely large request bodies', async () => {
      const largeData = {
        name: 'A'.repeat(1000), // Very long name
        therapyHistoryDetails: 'B'.repeat(10000), // Very long details
        medicationNames: 'C'.repeat(5000), // Very long medication list
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/patients', largeData)
      const response = await createPatientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.')
      expect(data.details).toEqual({
        validationErrors: expect.objectContaining({
          name: expect.stringContaining('muito longo'),
          therapyHistoryDetails: expect.stringContaining('muito longos'),
          medicationNames: expect.stringContaining('muito longa'),
        })
      })
    })

    it('should handle special characters and unicode in patient data', async () => {
      const unicodePatientData = {
        name: 'José María Ñoño',
        birthDate: '1990-05-15',
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '(11) 99999-9999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        therapyHistoryDetails: 'Histórico com acentos: ção, ã, é, ü',
      }

      const sanitizedData = sanitizePatientData(unicodePatientData)

      expect(sanitizedData.name).toBe('José María Ñoño')
      expect(sanitizedData.therapyHistoryDetails).toBe('Histórico com acentos: ção, ã, é, ü')
    })

    it('should handle empty and whitespace-only inputs', async () => {
      const emptyData = {
        name: '   ', // Whitespace only
        birthDate: '',
        gender: '',
        religion: '',
        phone1: '   ',
        hasTherapyHistory: false, // Use boolean instead of null
        takesMedication: false, // Use boolean instead of undefined
        hasHospitalization: false
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/patients', emptyData)
      const response = await createPatientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.')
      expect(data.details).toEqual({
        validationErrors: expect.objectContaining({
          name: expect.stringContaining('obrigatório'),
          phone1: expect.stringContaining('obrigatório'),
        })
      })
    })
  })
})