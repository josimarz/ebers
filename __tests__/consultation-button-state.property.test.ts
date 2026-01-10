/**
 * Property-based tests for consultation button state functionality
 * Feature: patient-management-system, Property 7: Consultation Button State
 * Validates: Requirements 3.5, 3.6
 */

import * as fc from 'fast-check'
import { listPatients } from '@/lib/patients'
import { prisma } from '@/lib/prisma'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    $disconnect: jest.fn()
  }
}))

const mockPrisma = jest.mocked(prisma)

describe('Property 7: Consultation Button State', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property: For any patient, the system should display "New Consultation" button 
   * when no active consultation exists, and "Consultation" button when an active 
   * consultation exists
   * 
   * Feature: patient-management-system, Property 7: Consultation Button State
   * Validates: Requirements 3.5, 3.6
   */
  it('should display correct consultation button based on active consultation status', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate patients with varied consultation states
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.oneof(
              fc.constant('João Silva'),
              fc.constant('Maria Santos'),
              fc.constant('Pedro Oliveira'),
              fc.constant('Ana Costa')
            ),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            phone1: fc.string({ minLength: 10, maxLength: 11 }),
            credits: fc.integer({ min: 0, max: 50 }),
            hasActiveConsultation: fc.boolean() // This determines the button state
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (patientDataList) => {
          // Create mock patients with consultation data based on hasActiveConsultation flag
          const mockPatients = patientDataList.map((patientData) => ({
            id: patientData.id,
            name: patientData.name,
            profilePhoto: null,
            birthDate: patientData.birthDate,
            gender: 'MALE',
            cpf: null,
            rg: null,
            religion: 'CATHOLIC',
            legalGuardian: null,
            legalGuardianEmail: null,
            legalGuardianCpf: null,
            phone1: patientData.phone1,
            phone2: null,
            email: null,
            hasTherapyHistory: false,
            therapyHistoryDetails: null,
            takesMedication: false,
            medicationSince: null,
            medicationNames: null,
            hasHospitalization: false,
            hospitalizationDate: null,
            hospitalizationReason: null,
            consultationPrice: null,
            consultationFrequency: null,
            consultationDay: null,
            credits: patientData.credits,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Use _count structure for active consultations
            _count: {
              consultations: patientData.hasActiveConsultation ? 1 : 0
            }
          }))

          // Mock database operations
          const totalCount = mockPatients.length
          mockPrisma.patient.count.mockResolvedValue(totalCount)
          mockPrisma.patient.findMany.mockResolvedValueOnce(mockPatients)

          // Test patient listing to get consultation button states
          const result = await listPatients({ page: 1, limit: 10 })

          // Verify that each patient has the correct hasActiveConsultation status
          expect(result.patients).toBeDefined()
          expect(Array.isArray(result.patients)).toBe(true)

          result.patients.forEach((patient, index) => {
            const originalPatientData = patientDataList[index]
            
            // Requirement 3.5: WHEN a patient has no active consultation, 
            // THE System SHALL display "New Consultation" button
            if (!originalPatientData.hasActiveConsultation) {
              expect(patient.hasActiveConsultation).toBe(false)
              // In the UI, this would translate to showing "New Consultation" button
            }
            
            // Requirement 3.6: WHEN a patient has an active consultation, 
            // THE System SHALL display "Consultation" button  
            if (originalPatientData.hasActiveConsultation) {
              expect(patient.hasActiveConsultation).toBe(true)
              // In the UI, this would translate to showing "Consultation" button
            }

            // Verify the hasActiveConsultation flag matches the consultation data
            expect(patient.hasActiveConsultation).toBe(originalPatientData.hasActiveConsultation)
          })

          // Verify that Prisma was called with the correct include for consultations
          expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: {
              name: 'asc'
            },
            skip: 0,
            take: 10,
            include: {
              _count: {
                select: {
                  consultations: {
                    where: {
                      status: 'OPEN'
                    }
                  }
                }
              }
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For patients with multiple consultations, only OPEN status consultations 
   * should affect the button state
   * 
   * Feature: patient-management-system, Property 7: Consultation Button State
   * Validates: Requirements 3.5, 3.6
   */
  it('should only consider OPEN consultations for button state determination', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate patients with various consultation scenarios
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            phone1: fc.string({ minLength: 10, maxLength: 11 }),
            credits: fc.integer({ min: 0, max: 50 }),
            consultationScenario: fc.oneof(
              fc.constant('no-consultations'),
              fc.constant('only-finalized'),
              fc.constant('has-open'),
              fc.constant('mixed-statuses')
            )
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (patientDataList) => {
          // Create mock patients with different consultation scenarios
          const mockPatients = patientDataList.map((patientData) => {
            let consultationCount = 0
            
            switch (patientData.consultationScenario) {
              case 'no-consultations':
                consultationCount = 0
                break
              case 'only-finalized':
                consultationCount = 0 // Finalized consultations are filtered out by the query
                break
              case 'has-open':
                consultationCount = 1
                break
              case 'mixed-statuses':
                consultationCount = 1 // Only OPEN consultations are counted
                break
            }

            return {
              id: patientData.id,
              name: patientData.name,
              profilePhoto: null,
              birthDate: patientData.birthDate,
              gender: 'MALE',
              cpf: null,
              rg: null,
              religion: 'CATHOLIC',
              legalGuardian: null,
              legalGuardianEmail: null,
              legalGuardianCpf: null,
              phone1: patientData.phone1,
              phone2: null,
              email: null,
              hasTherapyHistory: false,
              therapyHistoryDetails: null,
              takesMedication: false,
              medicationSince: null,
              medicationNames: null,
              hasHospitalization: false,
              hospitalizationDate: null,
              hospitalizationReason: null,
              consultationPrice: null,
              consultationFrequency: null,
              consultationDay: null,
              credits: patientData.credits,
              createdAt: new Date(),
              updatedAt: new Date(),
              _count: {
                consultations: consultationCount
              }
            }
          })

          // Mock database operations
          const totalCount = mockPatients.length
          mockPrisma.patient.count.mockResolvedValue(totalCount)
          mockPrisma.patient.findMany.mockResolvedValueOnce(mockPatients)

          // Test patient listing
          const result = await listPatients({ page: 1, limit: 10 })

          // Verify consultation button states based on scenarios
          result.patients.forEach((patient, index) => {
            const originalScenario = patientDataList[index].consultationScenario
            
            switch (originalScenario) {
              case 'no-consultations':
              case 'only-finalized':
                // Should show "New Consultation" button
                expect(patient.hasActiveConsultation).toBe(false)
                break
              case 'has-open':
              case 'mixed-statuses':
                // Should show "Consultation" button
                expect(patient.hasActiveConsultation).toBe(true)
                break
            }
          })
        }
      ),
      { numRuns: 50 }
    )
  })
})