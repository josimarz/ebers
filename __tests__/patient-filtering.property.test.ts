/**
 * Property-based tests for patient filtering functionality
 * Feature: patient-management-system, Property 6: Patient Filtering
 * Validates: Requirements 3.4
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

describe('Property 6: Patient Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property: For any patient dataset and search query, the system should return 
   * only patients whose names contain the search term (case-insensitive)
   * 
   * Feature: patient-management-system, Property 6: Patient Filtering
   * Validates: Requirements 3.4
   */
  it('should filter patients by name containing search term', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate a list of patients with varied names
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.oneof(
              fc.constant('João Silva'),
              fc.constant('Maria Santos'),
              fc.constant('Pedro Oliveira'),
              fc.constant('Ana Costa'),
              fc.constant('Carlos Ferreira'),
              fc.constant('Joana Pereira'),
              fc.constant('Paulo Rodrigues'),
              fc.constant('Mariana Lima')
            ),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            phone1: fc.string({ minLength: 10, maxLength: 11 }),
            credits: fc.integer({ min: 0, max: 50 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        // Generate search terms that should match some names
        fc.oneof(
          fc.constant('João'),
          fc.constant('Maria'),
          fc.constant('Silva'),
          fc.constant('Santos'),
          fc.constant('Ana'),
          fc.constant('Pedro'),
          fc.constant('Carlos'),
          fc.constant('Joana'),
          fc.constant('Paulo'),
          fc.constant('Mariana')
        ),
        async (patientDataList, searchTerm) => {
          // Create mock patients (as they would be returned by Prisma)
          const allMockPatients = patientDataList.map((patientData) => ({
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
              consultations: 0
            }
          }))

          // Filter patients that should match the search term
          const expectedMatches = allMockPatients.filter(patient =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase())
          )

          // Mock database operations for filtering test
          const totalCount = expectedMatches.length
          const limit = 10
          const filteredPatients = expectedMatches.slice(0, limit)

          // Mock count operation with search filter
          mockPrisma.patient.count.mockResolvedValue(totalCount)
          // Mock findMany with search filter
          mockPrisma.patient.findMany.mockResolvedValueOnce(filteredPatients)

          // Test filtering with search term
          const result = await listPatients({ 
            page: 1, 
            limit: 10, 
            search: searchTerm 
          })

          // Requirement 3.4: THE System SHALL provide name-based patient filtering functionality
          expect(result.patients).toBeDefined()
          expect(Array.isArray(result.patients)).toBe(true)

          // All returned patients should have names that contain the search term
          result.patients.forEach(patient => {
            expect(patient.name.toLowerCase()).toContain(searchTerm.toLowerCase())
          })

          // The total count should match the expected number of matches
          expect(result.totalCount).toBe(expectedMatches.length)

          // Verify that the correct Prisma methods were called with search parameters
          expect(mockPrisma.patient.count).toHaveBeenCalledWith({
            where: {
              name: {
                contains: searchTerm
              }
            }
          })

          expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
            where: {
              name: {
                contains: searchTerm
              }
            },
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

          // Pagination should work correctly with filtered results
          const expectedTotalPages = Math.ceil(expectedMatches.length / 10)
          expect(result.totalPages).toBe(expectedTotalPages)
          expect(result.currentPage).toBe(1)
          expect(result.hasNextPage).toBe(expectedMatches.length > 10)
          expect(result.hasPreviousPage).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For empty or very short search terms, the system should handle gracefully
   * 
   * Feature: patient-management-system, Property 6: Patient Filtering
   * Validates: Requirements 3.4
   */
  it('should handle empty and short search terms appropriately', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate edge case search terms
        fc.oneof(
          fc.constant(''),
          fc.constant(' '),
          fc.constant('a'),
          fc.constant('  ')
        ),
        async (searchTerm) => {
          // Mock empty results for edge cases
          mockPrisma.patient.count.mockResolvedValue(0)
          mockPrisma.patient.findMany.mockResolvedValueOnce([])

          // Test filtering with edge case search term
          const result = await listPatients({ 
            page: 1, 
            limit: 10, 
            search: searchTerm 
          })

          // Should return valid result structure even for edge cases
          expect(result.patients).toBeDefined()
          expect(Array.isArray(result.patients)).toBe(true)
          expect(result.totalCount).toBeGreaterThanOrEqual(0)
          expect(result.totalPages).toBeGreaterThanOrEqual(0)
          expect(result.currentPage).toBe(1)
          expect(typeof result.hasNextPage).toBe('boolean')
          expect(typeof result.hasPreviousPage).toBe('boolean')
        }
      ),
      { numRuns: 50 }
    )
  })
})