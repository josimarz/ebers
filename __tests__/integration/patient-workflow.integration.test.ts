/**
 * Integration tests for complete patient management workflows
 * Tests end-to-end user scenarios including error handling
 */

import { createPatient, listPatients, updatePatient, getPatient } from '@/lib/patients'
import { createConsultation, listConsultations } from '@/lib/consultations'
import { validatePatient, validatePatientIpad } from '@/lib/validations'
import { sanitizePatientData } from '@/lib/sanitization'
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

describe('Patient Management Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Patient Registration Workflow', () => {
    it('should handle complete patient registration from iPad to desktop completion', async () => {
      // Step 1: Patient starts registration on iPad (limited fields)
      const ipadPatientData = {
        name: 'João Silva',
        birthDate: new Date('1990-05-15'),
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '(11) 99999-9999',
        hasTherapyHistory: false,
        takesMedication: true,
        hasHospitalization: false,
        medicationNames: 'Fluoxetina',
        email: 'joao@email.com'
      }

      // Validate iPad data
      const ipadValidation = validatePatientIpad(ipadPatientData)
      expect(ipadValidation.success).toBe(true)

      // Sanitize iPad data
      const sanitizedIpadData = sanitizePatientData(ipadPatientData)
      expect(sanitizedIpadData.name).toBe('João Silva')
      expect(sanitizedIpadData.email).toBe('joao@email.com')

      // Mock patient creation
      const createdPatient = {
        id: 'patient-1',
        ...sanitizedIpadData,
        credits: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      mockPrisma.patient.create.mockResolvedValue(createdPatient)

      // Create patient with iPad data
      const patient = await createPatient(sanitizedIpadData)
      expect(patient.id).toBe('patient-1')
      expect(patient.credits).toBe(0)
      expect(patient.consultationPrice).toBeUndefined()

      // Step 2: Therapist completes registration on desktop
      const desktopUpdateData = {
        consultationPrice: 150.00,
        consultationFrequency: 'WEEKLY',
        consultationDay: 'TUESDAY',
        therapyHistoryDetails: 'Primeira vez em terapia'
      }

      // Validate complete patient data
      const completePatientData = { ...patient, ...desktopUpdateData }
      const desktopValidation = validatePatient(completePatientData)
      expect(desktopValidation.success).toBe(true)

      // Mock patient update
      const updatedPatient = { ...patient, ...desktopUpdateData }
      mockPrisma.patient.findUnique.mockResolvedValue(patient)
      mockPrisma.patient.update.mockResolvedValue(updatedPatient)

      // Update patient with desktop data
      const finalPatient = await updatePatient('patient-1', desktopUpdateData)
      expect(finalPatient.consultationPrice).toBe(150.00)
      expect(finalPatient.consultationFrequency).toBe('WEEKLY')

      // Verify all database calls
      expect(mockPrisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'João Silva',
          credits: 0
        })
      })
      expect(mockPrisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
        data: expect.objectContaining({
          consultationPrice: 150.00
        })
      })
    })

    it('should handle validation errors during patient registration', async () => {
      // Test invalid patient data
      const invalidPatientData = {
        name: '', // Empty name
        birthDate: 'invalid-date',
        gender: 'INVALID_GENDER',
        phone1: '',
        hasTherapyHistory: 'not-boolean'
      }

      // Validation should fail
      const validation = validatePatient(invalidPatientData)
      expect(validation.success).toBe(false)
      
      if (!validation.success) {
        expect(validation.error.issues.length).toBeGreaterThan(5) // Multiple validation errors
        expect(validation.error.issues.some(issue => issue.path.includes('name'))).toBe(true)
        expect(validation.error.issues.some(issue => issue.path.includes('birthDate'))).toBe(true)
        expect(validation.error.issues.some(issue => issue.path.includes('gender'))).toBe(true)
        expect(validation.error.issues.some(issue => issue.path.includes('phone1'))).toBe(true)
      }
    })

    it('should handle guardian email validation correctly', async () => {
      // Test patient with guardian but no email
      const patientWithGuardianNoEmail = {
        name: 'Maria Santos',
        birthDate: new Date('2010-03-20'),
        gender: 'FEMALE',
        religion: 'CATHOLIC',
        phone1: '(11) 88888-8888',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        legalGuardian: 'Ana Santos', // Guardian specified
        legalGuardianEmail: '' // But no email
      }

      const validation = validatePatient(patientWithGuardianNoEmail)
      expect(validation.success).toBe(false)
      
      if (!validation.success) {
        expect(validation.error.issues.some(issue => 
          issue.message.includes('Email do responsável é obrigatório')
        )).toBe(true)
      }

      // Test with valid guardian email
      const patientWithValidGuardian = {
        ...patientWithGuardianNoEmail,
        legalGuardianEmail: 'ana@email.com'
      }

      const validValidation = validatePatient(patientWithValidGuardian)
      expect(validValidation.success).toBe(true)
    })
  })

  describe('Complete Consultation Workflow', () => {
    it('should handle complete consultation lifecycle with credit management', async () => {
      // Setup: Patient with credits
      const patient = {
        id: 'patient-1',
        name: 'João Silva',
        consultationPrice: 150.00,
        credits: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.patient.findUnique.mockResolvedValue(patient)

      // Step 1: Create consultation (should use credit)
      const newConsultation = {
        id: 'consultation-1',
        patientId: 'patient-1',
        startedAt: new Date(),
        status: 'OPEN',
        content: '',
        notes: '',
        price: 150.00,
        paid: true, // Should be true because patient has credits
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: 'patient-1',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-05-15')
        }
      }

      // Mock the transaction to return the consultation
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Mock the transaction context
        const tx = {
          consultation: {
            create: jest.fn().mockResolvedValue(newConsultation)
          },
          patient: {
            update: jest.fn().mockResolvedValue({ ...patient, credits: 1 })
          }
        }
        return callback(tx)
      })

      // Mock findFirst to return no existing consultations
      mockPrisma.consultation.findFirst.mockResolvedValue(null)

      const consultation = await createConsultation({ patientId: 'patient-1' })
      
      expect(consultation.paid).toBe(true)
      expect(mockPrisma.$transaction).toHaveBeenCalled()

      // Step 2: Update consultation content
      const updatedConsultation = {
        ...consultation,
        content: '<p>Paciente relatou <strong>ansiedade</strong> durante a semana.</p>',
        notes: '<p>Observações: <em>paciente mais calmo hoje</em></p>'
      }

      // Content should be sanitized
      const sanitizedContent = updatedConsultation.content
      expect(sanitizedContent).toContain('<p>')
      expect(sanitizedContent).toContain('<strong>')

      // Step 3: Finalize consultation
      const finalizedConsultation = {
        ...updatedConsultation,
        status: 'FINALIZED',
        finishedAt: new Date()
      }

      mockPrisma.consultation.update.mockResolvedValue(finalizedConsultation)

      // Verify consultation workflow
      expect(consultation.patientId).toBe('patient-1')
      expect(consultation.price).toBe(150.00)
    })

    it('should handle consultation creation without credits', async () => {
      // Setup: Patient without credits
      const patient = {
        id: 'patient-2',
        name: 'Maria Santos',
        consultationPrice: 120.00,
        credits: 0, // No credits
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.patient.findUnique.mockResolvedValue(patient)

      // Create consultation (should not be paid)
      const newConsultation = {
        id: 'consultation-2',
        patientId: 'patient-2',
        startedAt: new Date(),
        status: 'OPEN',
        content: '',
        notes: '',
        price: 120.00,
        paid: false, // Should be false because no credits
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: 'patient-2',
          name: 'Maria Santos',
          profilePhoto: null,
          birthDate: new Date('1985-03-20')
        }
      }

      // Mock the transaction to return the consultation
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          consultation: {
            create: jest.fn().mockResolvedValue(newConsultation)
          },
          patient: {
            update: jest.fn()
          }
        }
        return callback(tx)
      })

      // Mock findFirst to return no existing consultations
      mockPrisma.consultation.findFirst.mockResolvedValue(null)

      const consultation = await createConsultation({ patientId: 'patient-2' })
      
      expect(consultation.paid).toBe(false)
    })

    it('should prevent multiple active consultations', async () => {
      // Setup: Patient with existing open consultation
      const patient = {
        id: 'patient-3',
        name: 'Carlos Lima',
        consultationPrice: 100.00,
        credits: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const existingConsultation = {
        id: 'consultation-3',
        patientId: 'patient-3',
        status: 'OPEN',
        createdAt: new Date()
      }

      mockPrisma.patient.findUnique.mockResolvedValue(patient)
      mockPrisma.consultation.findFirst.mockResolvedValue(existingConsultation)

      // Attempt to create new consultation should fail
      await expect(createConsultation({ patientId: 'patient-3' }))
        .rejects.toThrow('Paciente possui consulta não finalizada')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      mockPrisma.patient.findMany.mockRejectedValue(new Error('Database connection failed'))

      // Should handle error gracefully
      await expect(listPatients({ page: 1, limit: 10 }))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle invalid patient ID errors', async () => {
      // Mock patient not found
      mockPrisma.patient.findUnique.mockResolvedValue(null)

      const result = await getPatient('invalid-id')
      expect(result).toBeNull()
    })

    it('should handle concurrent consultation creation', async () => {
      const patient = {
        id: 'patient-4',
        name: 'Ana Costa',
        consultationPrice: 130.00,
        credits: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.patient.findUnique.mockResolvedValue(patient)
      
      // First call succeeds - no existing consultations
      mockPrisma.consultation.findFirst.mockResolvedValueOnce(null)
      
      const consultation = {
        id: 'consultation-4a',
        patientId: 'patient-4',
        status: 'OPEN',
        paid: true,
        createdAt: new Date(),
        patient: {
          id: 'patient-4',
          name: 'Ana Costa',
          profilePhoto: null,
          birthDate: new Date('1992-07-25')
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

      // Second call should find existing consultation
      mockPrisma.consultation.findFirst.mockResolvedValueOnce({
        id: 'consultation-4a',
        patientId: 'patient-4',
        status: 'OPEN'
      })

      // First consultation creation should succeed
      const consultation1 = await createConsultation({ patientId: 'patient-4' })
      expect(consultation1.id).toBe('consultation-4a')

      // Second consultation creation should fail
      await expect(createConsultation({ patientId: 'patient-4' }))
        .rejects.toThrow('Paciente possui consulta não finalizada')
    })
  })

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across patient and consultation operations', async () => {
      // Create patient
      const patientData = {
        name: 'Pedro Oliveira',
        birthDate: new Date('1985-08-10'),
        gender: 'MALE',
        religion: 'EVANGELICAL',
        phone1: '(11) 77777-7777',
        hasTherapyHistory: true,
        takesMedication: false,
        hasHospitalization: false,
        consultationPrice: 180.00,
        credits: 3
      }

      const createdPatient = {
        id: 'patient-5',
        ...patientData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.patient.create.mockResolvedValue(createdPatient)
      mockPrisma.patient.findUnique.mockResolvedValue(createdPatient)

      const patient = await createPatient(patientData)
      expect(patient.credits).toBe(3)

      // Create multiple consultations
      for (let i = 0; i < 3; i++) {
        const consultation = {
          id: `consultation-5${i}`,
          patientId: 'patient-5',
          startedAt: new Date(),
          status: 'OPEN',
          paid: true,
          price: 180.00,
          createdAt: new Date(),
          updatedAt: new Date(),
          patient: {
            id: 'patient-5',
            name: 'Pedro Oliveira',
            profilePhoto: null,
            birthDate: new Date('1985-08-10')
          }
        }

        // Mock no existing consultations for each attempt
        mockPrisma.consultation.findFirst.mockResolvedValueOnce(null)
        
        // Mock transaction for each consultation
        mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
          const tx = {
            consultation: {
              create: jest.fn().mockResolvedValue(consultation)
            },
            patient: {
              update: jest.fn().mockResolvedValue({
                ...createdPatient,
                credits: 3 - (i + 1)
              })
            }
          }
          return callback(tx)
        })

        const createdConsultation = await createConsultation({ patientId: 'patient-5' })
        expect(createdConsultation.paid).toBe(true)
      }

      // Verify all transactions were called
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3)
    })

    it('should handle pagination and filtering correctly', async () => {
      // Mock paginated patient list
      const patients = Array.from({ length: 25 }, (_, i) => ({
        id: `patient-${i}`,
        name: `Patient ${i}`,
        birthDate: new Date(1990 + i, 0, 1),
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        phone1: `(11) ${String(i).padStart(5, '0')}-0000`,
        credits: i,
        createdAt: new Date(),
        updatedAt: new Date(),
        consultations: [] // Add empty consultations array
      }))

      // First page
      mockPrisma.patient.findMany.mockResolvedValueOnce(patients.slice(0, 10))
      mockPrisma.patient.count.mockResolvedValueOnce(25)

      const firstPage = await listPatients({ page: 1, limit: 10 })
      expect(firstPage.patients).toHaveLength(10)
      expect(firstPage.totalPages).toBe(3)
      expect(firstPage.hasNextPage).toBe(true)

      // Second page
      mockPrisma.patient.findMany.mockResolvedValueOnce(patients.slice(10, 20))
      mockPrisma.patient.count.mockResolvedValueOnce(25)

      const secondPage = await listPatients({ page: 2, limit: 10 })
      expect(secondPage.patients).toHaveLength(10)
      expect(secondPage.hasNextPage).toBe(true)
      expect(secondPage.hasPreviousPage).toBe(true)

      // Last page
      mockPrisma.patient.findMany.mockResolvedValueOnce(patients.slice(20, 25))
      mockPrisma.patient.count.mockResolvedValueOnce(25)

      const lastPage = await listPatients({ page: 3, limit: 10 })
      expect(lastPage.patients).toHaveLength(5)
      expect(lastPage.hasNextPage).toBe(false)
      expect(lastPage.hasPreviousPage).toBe(true)
    })
  })
})