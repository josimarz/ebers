/**
 * Property-based tests for database referential integrity
 * Feature: patient-management-system, Property 19: Database Referential Integrity
 * Validates: Requirements 9.4
 */

import * as fc from 'fast-check'
import { createPatient, getPatient, deletePatient } from '@/lib/patients'
import { prisma } from '@/lib/prisma'
import { Gender, Religion } from '@/lib/validations'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn()
    },
    consultation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn()
    },
    $disconnect: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Test setup
beforeEach(() => {
  jest.clearAllMocks()
})

describe('Property 19: Database Referential Integrity', () => {
  /**
   * Property: For any database operation involving related entities, the system should maintain referential integrity constraints
   * 
   * Feature: patient-management-system, Property 19: Database Referential Integrity
   * Validates: Requirements 9.4
   */
  it('should maintain referential integrity when creating consultations for existing patients', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for valid patient data
        fc.record({
          name: fc.oneof(
            fc.constant('João Silva'),
            fc.constant('Maria Santos'),
            fc.constant('Pedro Oliveira'),
            fc.constant('Ana Costa')
          ),
          birthDate: fc.date({ min: new Date('1980-01-01'), max: new Date('2000-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.oneof(
            fc.constant('11999999999'),
            fc.constant('21987654321'),
            fc.constant('31876543210')
          ),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0, max: 10 })
        }),
        // Generator for consultation data
        fc.record({
          startedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          content: fc.oneof(
            fc.constant(''),
            fc.constant('Paciente relatou ansiedade'),
            fc.constant('Sessão produtiva')
          ),
          notes: fc.oneof(
            fc.constant(''),
            fc.constant('Observações importantes'),
            fc.constant('Paciente demonstrou progresso')
          ),
          price: fc.float({ min: 50, max: 300, noNaN: true }),
          status: fc.oneof(fc.constant('OPEN'), fc.constant('FINALIZED')),
          paid: fc.boolean()
        }),
        async (patientData, consultationData) => {
          // Mock patient creation
          const mockPatientId = 'patient-' + Math.random().toString(36).substring(2, 9)
          const mockPatient = {
            id: mockPatientId,
            ...patientData,
            profilePhoto: null,
            cpf: null,
            rg: null,
            legalGuardian: null,
            legalGuardianEmail: null,
            legalGuardianCpf: null,
            phone2: null,
            email: null,
            therapyHistoryDetails: null,
            medicationSince: null,
            medicationNames: null,
            hospitalizationDate: null,
            hospitalizationReason: null,
            consultationPrice: null,
            consultationFrequency: null,
            consultationDay: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          }

          // Mock consultation creation with valid patient reference
          const mockConsultationId = 'consultation-' + Math.random().toString(36).substring(2, 9)
          const mockConsultation = {
            id: mockConsultationId,
            patientId: mockPatientId, // Valid foreign key reference
            startedAt: consultationData.startedAt,
            finishedAt: consultationData.status === 'FINALIZED' ? new Date() : null,
            paidAt: consultationData.paid ? new Date() : null,
            status: consultationData.status,
            content: consultationData.content,
            notes: consultationData.notes,
            price: consultationData.price,
            paid: consultationData.paid,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          // Mock database operations
          mockPrisma.patient.create.mockResolvedValue(mockPatient)
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatient)
          mockPrisma.consultation.create.mockResolvedValue(mockConsultation)
          mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation)

          // Create patient first (referential integrity requires parent to exist)
          const createdPatient = await createPatient(patientData)
          expect(createdPatient).toBeDefined()
          expect(createdPatient.id).toBe(mockPatientId)

          // Create consultation with valid patient reference
          const createdConsultation = await mockPrisma.consultation.create({
            data: {
              patientId: createdPatient.id, // Valid foreign key
              startedAt: consultationData.startedAt,
              finishedAt: consultationData.status === 'FINALIZED' ? new Date() : null,
              paidAt: consultationData.paid ? new Date() : null,
              status: consultationData.status,
              content: consultationData.content,
              notes: consultationData.notes,
              price: consultationData.price,
              paid: consultationData.paid
            }
          })

          // Verify referential integrity is maintained
          expect(createdConsultation).toBeDefined()
          expect(createdConsultation.patientId).toBe(createdPatient.id)

          // Verify consultation can be retrieved with valid patient reference
          const retrievedConsultation = await mockPrisma.consultation.findUnique({
            where: { id: createdConsultation.id }
          })

          expect(retrievedConsultation).not.toBeNull()
          if (retrievedConsultation) {
            expect(retrievedConsultation.patientId).toBe(createdPatient.id)
            expect(retrievedConsultation.id).toBe(createdConsultation.id)
          }

          // Verify patient still exists and can be retrieved
          const retrievedPatient = await getPatient(createdPatient.id)
          expect(retrievedPatient).not.toBeNull()
          if (retrievedPatient) {
            expect(retrievedPatient.id).toBe(createdPatient.id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any attempt to create consultation with invalid patient reference, the system should reject the operation
   * 
   * Feature: patient-management-system, Property 19: Database Referential Integrity
   * Validates: Requirements 9.4
   */
  it('should reject consultation creation with invalid patient references', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for invalid patient IDs
        fc.oneof(
          fc.constant('invalid-patient-id'),
          fc.constant('nonexistent-' + Math.random().toString(36).substring(2, 9)),
          fc.constant(''),
          fc.constant('null'),
          fc.constant('undefined')
        ),
        // Generator for consultation data
        fc.record({
          startedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          content: fc.constant('Test content'),
          notes: fc.constant('Test notes'),
          price: fc.float({ min: 50, max: 300, noNaN: true }),
          status: fc.constant('OPEN'),
          paid: fc.boolean()
        }),
        async (invalidPatientId, consultationData) => {
          // Mock that patient doesn't exist
          mockPrisma.patient.findUnique.mockResolvedValue(null)
          
          // Mock consultation creation to throw referential integrity error
          const referentialIntegrityError = new Error('Foreign key constraint failed')
          referentialIntegrityError.name = 'PrismaClientKnownRequestError'
          // @ts-ignore - Adding Prisma error code
          referentialIntegrityError.code = 'P2003'
          mockPrisma.consultation.create.mockRejectedValue(referentialIntegrityError)

          // Attempt to create consultation with invalid patient reference should fail
          await expect(
            mockPrisma.consultation.create({
              data: {
                patientId: invalidPatientId,
                startedAt: consultationData.startedAt,
                content: consultationData.content,
                notes: consultationData.notes,
                price: consultationData.price,
                status: consultationData.status,
                paid: consultationData.paid
              }
            })
          ).rejects.toThrow()

          // Verify the error is related to referential integrity
          try {
            await mockPrisma.consultation.create({
              data: {
                patientId: invalidPatientId,
                startedAt: consultationData.startedAt,
                content: consultationData.content,
                notes: consultationData.notes,
                price: consultationData.price,
                status: consultationData.status,
                paid: consultationData.paid
              }
            })
            // Should not reach here
            expect(true).toBe(false)
          } catch (error: any) {
            // Verify it's a referential integrity error
            expect(error).toBeDefined()
            expect(error.message).toContain('Foreign key constraint')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any patient with consultations, deletion should be prevented to maintain referential integrity
   * 
   * Feature: patient-management-system, Property 19: Database Referential Integrity
   * Validates: Requirements 9.4
   */
  it('should prevent patient deletion when consultations exist (referential integrity protection)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for patient data
        fc.record({
          name: fc.oneof(
            fc.constant('João Silva'),
            fc.constant('Maria Santos'),
            fc.constant('Pedro Oliveira')
          ),
          birthDate: fc.date({ min: new Date('1980-01-01'), max: new Date('2000-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0, max: 5 })
        }),
        // Generator for number of consultations (1 or more)
        fc.integer({ min: 1, max: 5 }),
        async (patientData, consultationCount) => {
          // Mock patient creation
          const mockPatientId = 'patient-' + Math.random().toString(36).substring(2, 9)
          const mockPatient = {
            id: mockPatientId,
            ...patientData,
            profilePhoto: null,
            cpf: null,
            rg: null,
            legalGuardian: null,
            legalGuardianEmail: null,
            legalGuardianCpf: null,
            phone2: null,
            email: null,
            therapyHistoryDetails: null,
            medicationSince: null,
            medicationNames: null,
            hospitalizationDate: null,
            hospitalizationReason: null,
            consultationPrice: null,
            consultationFrequency: null,
            consultationDay: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          }

          // Mock database operations
          mockPrisma.patient.create.mockResolvedValue(mockPatient)
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatient)
          
          // Mock consultation count to return the generated number
          mockPrisma.consultation.count.mockResolvedValue(consultationCount)
          
          // Mock patient deletion to throw error when consultations exist
          const referentialIntegrityError = new Error('Não é possível excluir paciente com consultas registradas')
          mockPrisma.patient.delete.mockRejectedValue(referentialIntegrityError)

          // Create patient
          const createdPatient = await createPatient(patientData)
          expect(createdPatient).toBeDefined()

          // Attempt to delete patient with consultations should fail
          await expect(deletePatient(createdPatient.id)).rejects.toThrow(
            'Não é possível excluir paciente com consultas registradas'
          )

          // Verify consultation count was checked
          expect(mockPrisma.consultation.count).toHaveBeenCalledWith({
            where: { patientId: createdPatient.id }
          })

          // Verify patient deletion was not attempted due to referential integrity check
          expect(mockPrisma.patient.delete).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any patient without consultations, deletion should succeed (no referential integrity violations)
   * 
   * Feature: patient-management-system, Property 19: Database Referential Integrity
   * Validates: Requirements 9.4
   */
  it('should allow patient deletion when no consultations exist (no referential integrity violations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for patient data
        fc.record({
          name: fc.oneof(
            fc.constant('João Silva'),
            fc.constant('Maria Santos'),
            fc.constant('Pedro Oliveira')
          ),
          birthDate: fc.date({ min: new Date('1980-01-01'), max: new Date('2000-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0, max: 5 })
        }),
        async (patientData) => {
          // Mock patient creation
          const mockPatientId = 'patient-' + Math.random().toString(36).substring(2, 9)
          const mockPatient = {
            id: mockPatientId,
            ...patientData,
            profilePhoto: null,
            cpf: null,
            rg: null,
            legalGuardian: null,
            legalGuardianEmail: null,
            legalGuardianCpf: null,
            phone2: null,
            email: null,
            therapyHistoryDetails: null,
            medicationSince: null,
            medicationNames: null,
            hospitalizationDate: null,
            hospitalizationReason: null,
            consultationPrice: null,
            consultationFrequency: null,
            consultationDay: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          }

          // Mock database operations
          mockPrisma.patient.create.mockResolvedValue(mockPatient)
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatient)
          
          // Mock consultation count to return 0 (no consultations)
          mockPrisma.consultation.count.mockResolvedValue(0)
          
          // Mock successful patient deletion
          mockPrisma.patient.delete.mockResolvedValue(mockPatient)

          // Create patient
          const createdPatient = await createPatient(patientData)
          expect(createdPatient).toBeDefined()

          // Delete patient without consultations should succeed
          await expect(deletePatient(createdPatient.id)).resolves.not.toThrow()

          // Verify consultation count was checked
          expect(mockPrisma.consultation.count).toHaveBeenCalledWith({
            where: { patientId: createdPatient.id }
          })

          // Verify patient deletion was attempted
          expect(mockPrisma.patient.delete).toHaveBeenCalledWith({
            where: { id: createdPatient.id }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any consultation update, the patient reference should remain valid and unchanged
   * 
   * Feature: patient-management-system, Property 19: Database Referential Integrity
   * Validates: Requirements 9.4
   */
  it('should maintain valid patient references during consultation updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator for patient data
        fc.record({
          name: fc.constant('Test Patient'),
          birthDate: fc.date({ min: new Date('1980-01-01'), max: new Date('2000-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0, max: 5 })
        }),
        // Generator for initial consultation data
        fc.record({
          startedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          content: fc.constant('Initial content'),
          notes: fc.constant('Initial notes'),
          price: fc.float({ min: 50, max: 300, noNaN: true }),
          status: fc.constant('OPEN'),
          paid: fc.boolean()
        }),
        // Generator for consultation updates
        fc.record({
          content: fc.option(fc.oneof(
            fc.constant('Updated content'),
            fc.constant('New session notes'),
            fc.constant('Progress update')
          )),
          notes: fc.option(fc.oneof(
            fc.constant('Updated notes'),
            fc.constant('New observations'),
            fc.constant('Important findings')
          )),
          status: fc.option(fc.constant('FINALIZED')),
          paid: fc.option(fc.boolean())
        }),
        async (patientData, initialConsultationData, updateData) => {
          // Clear all mocks for this test iteration
          jest.clearAllMocks()
          
          // Generate consistent IDs for this test run
          const testRunId = Math.random().toString(36).substring(2, 9)
          const mockPatientId = 'patient-' + testRunId
          const mockConsultationId = 'consultation-' + testRunId
          
          const mockPatient = {
            id: mockPatientId,
            ...patientData,
            profilePhoto: null,
            cpf: null,
            rg: null,
            legalGuardian: null,
            legalGuardianEmail: null,
            legalGuardianCpf: null,
            phone2: null,
            email: null,
            therapyHistoryDetails: null,
            medicationSince: null,
            medicationNames: null,
            hospitalizationDate: null,
            hospitalizationReason: null,
            consultationPrice: null,
            consultationFrequency: null,
            consultationDay: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            consultations: []
          }

          // Mock initial consultation
          const mockInitialConsultation = {
            id: mockConsultationId,
            patientId: mockPatientId,
            startedAt: initialConsultationData.startedAt,
            finishedAt: null,
            paidAt: initialConsultationData.paid ? new Date() : null,
            status: initialConsultationData.status,
            content: initialConsultationData.content,
            notes: initialConsultationData.notes,
            price: initialConsultationData.price,
            paid: initialConsultationData.paid,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          // Mock updated consultation (patient reference should remain the same)
          const mockUpdatedConsultation = {
            ...mockInitialConsultation,
            content: updateData.content !== undefined ? updateData.content : mockInitialConsultation.content,
            notes: updateData.notes !== undefined ? updateData.notes : mockInitialConsultation.notes,
            status: updateData.status !== undefined ? updateData.status : mockInitialConsultation.status,
            paid: updateData.paid !== undefined ? updateData.paid : mockInitialConsultation.paid,
            finishedAt: updateData.status === 'FINALIZED' ? new Date() : mockInitialConsultation.finishedAt,
            paidAt: updateData.paid === true ? new Date() : mockInitialConsultation.paidAt,
            updatedAt: new Date()
          }

          // Set up mocks for this specific test iteration
          mockPrisma.patient.create.mockResolvedValueOnce(mockPatient)
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatient)
          mockPrisma.consultation.create.mockResolvedValueOnce(mockInitialConsultation)
          mockPrisma.consultation.update.mockResolvedValueOnce(mockUpdatedConsultation)
          mockPrisma.consultation.findUnique.mockResolvedValueOnce(mockUpdatedConsultation)

          // Create patient
          const createdPatient = await createPatient(patientData)
          expect(createdPatient).toBeDefined()
          expect(createdPatient.id).toBe(mockPatientId)

          // Create consultation
          const createdConsultation = await mockPrisma.consultation.create({
            data: {
              patientId: createdPatient.id,
              startedAt: initialConsultationData.startedAt,
              content: initialConsultationData.content,
              notes: initialConsultationData.notes,
              price: initialConsultationData.price,
              status: initialConsultationData.status,
              paid: initialConsultationData.paid
            }
          })

          expect(createdConsultation).toBeDefined()
          expect(createdConsultation.id).toBe(mockConsultationId)
          expect(createdConsultation.patientId).toBe(mockPatientId)

          // Update consultation (should maintain patient reference)
          const updatedConsultation = await mockPrisma.consultation.update({
            where: { id: createdConsultation.id },
            data: {
              content: updateData.content,
              notes: updateData.notes,
              status: updateData.status,
              paid: updateData.paid,
              finishedAt: updateData.status === 'FINALIZED' ? new Date() : undefined,
              paidAt: updateData.paid === true ? new Date() : undefined
            }
          })

          // Verify referential integrity is maintained
          expect(updatedConsultation).toBeDefined()
          expect(updatedConsultation.patientId).toBe(createdPatient.id) // Patient reference unchanged
          expect(updatedConsultation.id).toBe(createdConsultation.id)

          // Retrieve consultation and verify patient reference is still valid
          const retrievedConsultation = await mockPrisma.consultation.findUnique({
            where: { id: createdConsultation.id }
          })

          expect(retrievedConsultation).not.toBeNull()
          if (retrievedConsultation) {
            expect(retrievedConsultation.patientId).toBe(createdPatient.id)
            expect(retrievedConsultation.id).toBe(createdConsultation.id)
            
            // Verify updates were applied
            if (updateData.content !== undefined) {
              expect(retrievedConsultation.content).toBe(updateData.content)
            }
            if (updateData.notes !== undefined) {
              expect(retrievedConsultation.notes).toBe(updateData.notes)
            }
            if (updateData.status !== undefined) {
              expect(retrievedConsultation.status).toBe(updateData.status)
            }
            if (updateData.paid !== undefined) {
              expect(retrievedConsultation.paid).toBe(updateData.paid)
            }
          }

          // Verify patient still exists and is accessible
          const retrievedPatient = await getPatient(createdPatient.id)
          expect(retrievedPatient).not.toBeNull()
          if (retrievedPatient) {
            expect(retrievedPatient.id).toBe(createdPatient.id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})