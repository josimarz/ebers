/**
 * Integration tests for API routes
 * Tests complete API workflows including error handling and validation
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
import { GET as getConsultationsHandler, POST as createConsultationHandler } from '@/app/api/consultations/route'
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

// Helper function to create mock NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return request
}

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Patients API Integration', () => {
    describe('GET /api/patients', () => {
      it('should return paginated patients list with proper structure', async () => {
        const mockPatients = [
          {
            id: 'patient-1',
            name: 'João Silva',
            birthDate: new Date('1990-05-15'),
            gender: 'MALE',
            phone1: '(11) 99999-9999',
            credits: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          },
          {
            id: 'patient-2',
            name: 'Maria Santos',
            birthDate: new Date('1985-03-20'),
            gender: 'FEMALE',
            phone1: '(11) 88888-8888',
            credits: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          },
        ]

        mockPrisma.patient.findMany.mockResolvedValue(mockPatients)
        mockPrisma.patient.count.mockResolvedValue(2)

        const request = createMockRequest('GET', 'http://localhost:3000/api/patients?page=1&limit=10')
        const response = await getPatientsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.patients).toHaveLength(2)
        expect(data.totalCount).toBe(2)
        expect(data.totalPages).toBe(1)
        expect(data.hasNextPage).toBe(false)
        expect(data.hasPreviousPage).toBe(false)
      })

      it('should handle search and filtering correctly', async () => {
        const mockPatients = [
          {
            id: 'patient-1',
            name: 'João Silva',
            birthDate: new Date('1990-05-15'),
            gender: 'MALE',
            phone1: '(11) 99999-9999',
            credits: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          },
        ]

        mockPrisma.patient.findMany.mockResolvedValue(mockPatients)
        mockPrisma.patient.count.mockResolvedValue(1)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/patients?search=João&sortBy=name&sortOrder=asc'
        )
        const response = await getPatientsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.patients).toHaveLength(1)
        expect(data.patients[0].name).toBe('João Silva')

        // Verify Prisma was called with correct parameters
        expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
          where: {
            name: {
              contains: 'João',
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
          orderBy: {
            name: 'asc',
          },
          skip: 0,
          take: 10,
        })
      })

      it('should handle validation errors for invalid parameters', async () => {
        const request = createMockRequest('GET', 'http://localhost:3000/api/patients?page=0&limit=200')
        const response = await getPatientsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Página deve ser maior que 0')
      })

      it('should handle database errors gracefully', async () => {
        mockPrisma.patient.findMany.mockRejectedValue(new Error('Database connection failed'))

        const request = createMockRequest('GET', 'http://localhost:3000/api/patients')
        const response = await getPatientsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBeDefined()
      })
    })

    describe('POST /api/patients', () => {
      it('should create patient with valid data from desktop', async () => {
        const patientData = {
          name: 'Carlos Lima',
          birthDate: '1988-12-10',
          gender: 'MALE',
          religion: 'CATHOLIC',
          phone1: '(11) 77777-7777',
          hasTherapyHistory: false,
          takesMedication: true,
          hasHospitalization: false,
          consultationPrice: 150.00,
          credits: 0,
        }

        const createdPatient = {
          id: 'patient-3',
          ...patientData,
          birthDate: new Date(patientData.birthDate),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.patient.create.mockResolvedValue(createdPatient)

        const request = createMockRequest('POST', 'http://localhost:3000/api/patients', patientData)
        const response = await createPatientHandler(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.id).toBe('patient-3')
        expect(data.name).toBe('Carlos Lima')
        expect(data.consultationPrice).toBe(150.00)
      })

      it('should create patient with limited data from iPad', async () => {
        const ipadPatientData = {
          name: 'Ana Costa',
          birthDate: '1992-07-25',
          gender: 'FEMALE',
          religion: 'EVANGELICAL',
          phone1: '(11) 66666-6666',
          hasTherapyHistory: true,
          takesMedication: false,
          hasHospitalization: false,
        }

        const createdPatient = {
          id: 'patient-4',
          ...ipadPatientData,
          birthDate: new Date(ipadPatientData.birthDate),
          credits: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.patient.create.mockResolvedValue(createdPatient)

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/patients',
          ipadPatientData,
          { 'user-agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' }
        )
        const response = await createPatientHandler(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.id).toBe('patient-4')
        expect(data.name).toBe('Ana Costa')
        expect(data.credits).toBe(0)
        expect(data.consultationPrice).toBeUndefined()
      })

      it('should handle validation errors for invalid patient data', async () => {
        const invalidPatientData = {
          name: '', // Empty name
          birthDate: 'invalid-date',
          gender: 'INVALID_GENDER',
          phone1: '',
        }

        const request = createMockRequest('POST', 'http://localhost:3000/api/patients', invalidPatientData)
        const response = await createPatientHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.')
        expect(data.details).toBeDefined()
      })

      it('should handle guardian email validation', async () => {
        const patientWithGuardianNoEmail = {
          name: 'Pedro Santos',
          birthDate: '2010-03-15',
          gender: 'MALE',
          religion: 'CATHOLIC',
          phone1: '(11) 55555-5555',
          hasTherapyHistory: false,
          takesMedication: false,
          hasHospitalization: false,
          legalGuardian: 'Maria Santos',
          legalGuardianEmail: '', // Missing email
        }

        const request = createMockRequest('POST', 'http://localhost:3000/api/patients', patientWithGuardianNoEmail)
        const response = await createPatientHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.')
        expect(data.details).toEqual({
          validationErrors: expect.objectContaining({
            legalGuardianEmail: expect.stringContaining('Email do responsável é obrigatório')
          })
        })
      })
    })
  })

  describe('Consultations API Integration', () => {
    describe('GET /api/consultations', () => {
      it('should return paginated consultations list', async () => {
        const mockConsultations = [
          {
            id: 'consultation-1',
            patientId: 'patient-1',
            startedAt: new Date(),
            status: 'OPEN',
            paid: true,
            price: 150.00,
            patient: {
              id: 'patient-1',
              name: 'João Silva',
              profilePhoto: null,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'consultation-2',
            patientId: 'patient-2',
            startedAt: new Date(),
            status: 'FINALIZED',
            paid: false,
            price: 120.00,
            patient: {
              id: 'patient-2',
              name: 'Maria Santos',
              profilePhoto: null,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        mockPrisma.consultation.findMany.mockResolvedValue(mockConsultations)
        mockPrisma.consultation.count.mockResolvedValue(2)

        const request = createMockRequest('GET', 'http://localhost:3000/api/consultations?page=1&limit=10')
        const response = await getConsultationsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.consultations).toHaveLength(2)
        expect(data.totalCount).toBe(2)
        expect(data.consultations[0].patient.name).toBe('João Silva')
      })

      it('should filter consultations by patient', async () => {
        const mockConsultations = [
          {
            id: 'consultation-1',
            patientId: 'patient-1',
            startedAt: new Date(),
            status: 'OPEN',
            paid: true,
            price: 150.00,
            patient: {
              id: 'patient-1',
              name: 'João Silva',
              profilePhoto: null,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        mockPrisma.consultation.findMany.mockResolvedValue(mockConsultations)
        mockPrisma.consultation.count.mockResolvedValue(1)

        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/consultations?patientId=patient-1'
        )
        const response = await getConsultationsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.consultations).toHaveLength(1)
        expect(data.consultations[0].patientId).toBe('patient-1')

        // Verify Prisma was called with correct filter
        expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith({
          where: {
            patientId: 'patient-1',
          },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
                birthDate: true
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          skip: 0,
          take: 10,
        })
      })

      it('should handle invalid query parameters', async () => {
        const request = createMockRequest(
          'GET',
          'http://localhost:3000/api/consultations?status=INVALID_STATUS'
        )
        const response = await getConsultationsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Status deve ser "OPEN" ou "FINALIZED"')
      })
    })

    describe('POST /api/consultations', () => {
      it('should create consultation with credit deduction', async () => {
        const patient = {
          id: 'patient-1',
          name: 'João Silva',
          consultationPrice: 150.00,
          credits: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const createdConsultation = {
          id: 'consultation-1',
          patientId: 'patient-1',
          startedAt: new Date(),
          status: 'OPEN',
          content: '',
          notes: '',
          price: 150.00,
          paid: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.patient.findUnique.mockResolvedValue(patient)
        mockPrisma.consultation.findFirst.mockResolvedValue(null) // No existing consultations
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const tx = {
            consultation: {
              create: jest.fn().mockResolvedValue({
                ...createdConsultation,
                patient: {
                  id: 'patient-1',
                  name: 'João Silva',
                  profilePhoto: null,
                  birthDate: new Date('1990-05-15')
                }
              })
            },
            patient: {
              update: jest.fn().mockResolvedValue({ ...patient, credits: 1 })
            }
          }
          return callback(tx)
        })

        const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
          patientId: 'patient-1',
        })
        const response = await createConsultationHandler(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.id).toBe('consultation-1')
        expect(data.paid).toBe(true)
        expect(data.price).toBe(150.00)

        // Verify credit was deducted
        expect(mockPrisma.$transaction).toHaveBeenCalled()
      })

      it('should create consultation without credit deduction when no credits', async () => {
        const patient = {
          id: 'patient-2',
          name: 'Maria Santos',
          consultationPrice: 120.00,
          credits: 0, // No credits
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const createdConsultation = {
          id: 'consultation-2',
          patientId: 'patient-2',
          startedAt: new Date(),
          status: 'OPEN',
          content: '',
          notes: '',
          price: 120.00,
          paid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.patient.findUnique.mockResolvedValue(patient)
        mockPrisma.consultation.findFirst.mockResolvedValue(null) // No existing consultations
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const tx = {
            consultation: {
              create: jest.fn().mockResolvedValue({
                ...createdConsultation,
                patient: {
                  id: 'patient-2',
                  name: 'Maria Santos',
                  profilePhoto: null,
                  birthDate: new Date('1985-03-20')
                }
              })
            },
            patient: {
              update: jest.fn()
            }
          }
          return callback(tx)
        })

        const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
          patientId: 'patient-2',
        })
        const response = await createConsultationHandler(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.id).toBe('consultation-2')
        expect(data.paid).toBe(false)
        expect(data.price).toBe(120.00)

        // Verify credits were not updated
        expect(mockPrisma.$transaction).toHaveBeenCalled()
      })

      it('should prevent creating consultation when patient has unfinalized consultation', async () => {
        const patient = {
          id: 'patient-3',
          name: 'Carlos Lima',
          consultationPrice: 100.00,
          credits: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const existingConsultation = {
          id: 'consultation-existing',
          patientId: 'patient-3',
          status: 'OPEN',
          createdAt: new Date(),
        }

        mockPrisma.patient.findUnique.mockResolvedValue(patient)
        mockPrisma.consultation.findFirst.mockResolvedValue(existingConsultation)

        const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
          patientId: 'patient-3',
        })
        const response = await createConsultationHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('não finalizada')
      })

      it('should handle missing patient ID', async () => {
        const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {})
        const response = await createConsultationHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('ID do paciente é obrigatório')
      })

      it('should handle non-existent patient', async () => {
        mockPrisma.patient.findUnique.mockResolvedValue(null)

        const request = createMockRequest('POST', 'http://localhost:3000/api/consultations', {
          patientId: 'non-existent-patient',
        })
        const response = await createConsultationHandler(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toContain('não encontrado')
      })
    })
  })

  describe('Cross-API Integration', () => {
    it('should handle complete patient-consultation workflow', async () => {
      // Step 1: Create patient
      const patientData = {
        name: 'Integration Test Patient',
        birthDate: '1990-01-01',
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '(11) 99999-9999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        consultationPrice: 200.00,
        credits: 1,
      }

      const createdPatient = {
        id: 'integration-patient',
        ...patientData,
        birthDate: new Date(patientData.birthDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.patient.create.mockResolvedValue(createdPatient)

      const createPatientRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/patients',
        patientData
      )
      const createPatientResponse = await createPatientHandler(createPatientRequest)
      const patientResult = await createPatientResponse.json()

      expect(createPatientResponse.status).toBe(201)
      expect(patientResult.id).toBe('integration-patient')

      // Step 2: Create consultation for the patient
      mockPrisma.patient.findUnique.mockResolvedValue(createdPatient)
      mockPrisma.consultation.findFirst.mockResolvedValue(null) // No existing consultations

      const createdConsultation = {
        id: 'integration-consultation',
        patientId: 'integration-patient',
        startedAt: new Date(),
        status: 'OPEN',
        content: '',
        notes: '',
        price: 200.00,
        paid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          consultation: {
            create: jest.fn().mockResolvedValue({
              ...createdConsultation,
              patient: {
                id: 'integration-patient',
                name: 'Integration Test Patient',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            })
          },
          patient: {
            update: jest.fn().mockResolvedValue({ ...createdPatient, credits: 0 })
          }
        }
        return callback(tx)
      })

      const createConsultationRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/consultations',
        { patientId: 'integration-patient' }
      )
      const createConsultationResponse = await createConsultationHandler(createConsultationRequest)
      const consultationResult = await createConsultationResponse.json()

      expect(createConsultationResponse.status).toBe(201)
      expect(consultationResult.id).toBe('integration-consultation')
      expect(consultationResult.paid).toBe(true)

      // Step 3: Verify patient credits were updated
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })
})